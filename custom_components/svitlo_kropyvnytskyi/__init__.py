"""Minute-by-minute public electricity schedules."""
from datetime import datetime, timedelta
import logging
from zoneinfo import ZoneInfo

from homeassistant.const import Platform
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.storage import Store
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .api import FeedError, fetch_feed
from .const import DOMAIN, selected_groups
from .frontend import async_register_card

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)
PLATFORMS = [Platform.SENSOR]
KYIV = ZoneInfo("Europe/Kyiv")


async def async_setup(hass, config):
    await async_register_card(hass)
    return True


class ScheduleCoordinator(DataUpdateCoordinator):
    def __init__(self, hass, entry):
        super().__init__(hass, logging.getLogger(__name__), name=DOMAIN,
                         config_entry=entry, update_interval=timedelta(seconds=60))
        self.groups = selected_groups(entry.data, entry.options)
        self.group = self.groups[0]
        self.schedules = {}
        self.store = Store(hass, 1, f"{DOMAIN}.{entry.entry_id}")

    async def _async_update_data(self):
        try:
            fresh = await fetch_feed(async_get_clientsession(self.hass))
        except FeedError as err:
            raise UpdateFailed(str(err)) from err
        # Keep today's post if tomorrow and chatter pushed it off the last page.
        self.schedules.update(fresh)
        today = datetime.now(KYIV).date()
        self.schedules = {day: value for day, value in self.schedules.items()
                          if today.isoformat() <= day <= (today + timedelta(days=2)).isoformat()}
        await self.store.async_save(self.schedules)
        return {"schedules": dict(self.schedules), "checked_at": datetime.now(KYIV).isoformat()}


async def async_setup_entry(hass, entry):
    coordinator = ScheduleCoordinator(hass, entry)
    coordinator.schedules = await coordinator.store.async_load() or {}
    await coordinator.async_config_entry_first_refresh()
    entry.runtime_data = coordinator
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(async_reload_entry))
    return True


async def async_reload_entry(hass, entry):
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass, entry):
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)


async def async_remove_entry(hass, entry):
    await Store(hass, 1, f"{DOMAIN}.{entry.entry_id}").async_remove()
