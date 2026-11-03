"""Expose the schedule and its provenance to the bundled card."""
from datetime import datetime
from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from . import KYIV
from .api import group_days
from .const import DOMAIN


async def async_setup_entry(hass, entry, async_add_entities):
    async_add_entities([ScheduleSensor(entry.runtime_data, entry)])


class ScheduleSensor(CoordinatorEntity, SensorEntity):
    _attr_has_entity_name = True
    _attr_translation_key = "schedule"
    _attr_icon = "mdi:transmission-tower-off"
    _unrecorded_attributes = frozenset({"days", "queues", "checked_at"})

    def __init__(self, coordinator, entry):
        super().__init__(coordinator)
        self._attr_unique_id = f"{entry.entry_id}_schedule"
        self._attr_device_info = {"identifiers": {(DOMAIN, entry.entry_id)},
                                  "name": entry.title, "manufacturer": "Community",
                                  "model": "Telegram schedule"}

    @property
    def native_value(self):
        now = datetime.now(KYIV)
        day = group_days(self.coordinator.schedules, self.coordinator.group, now.date())[0]
        if not day["known"]:
            return "no_schedule"
        minute = now.hour * 60 + now.minute
        return "scheduled_off" if any(start <= minute < end for start, end in day["intervals"]) else "scheduled_on"

    @property
    def extra_state_attributes(self):
        now = datetime.now(KYIV)
        minute = now.hour * 60 + now.minute
        queues = []
        for group in self.coordinator.groups:
            days = group_days(self.coordinator.schedules, group, now.date())
            status = "no_schedule" if not days[0]["known"] else (
                "scheduled_off" if any(start <= minute < end for start, end in days[0]["intervals"]) else "scheduled_on")
            queues.append({"group": group, "days": days, "state": status})
        return {"group": self.coordinator.group, "groups": self.coordinator.groups,
                "queues": queues, "timezone": "Europe/Kyiv",
                "days": queues[0]["days"],
                "checked_at": self.coordinator.data["checked_at"]}
