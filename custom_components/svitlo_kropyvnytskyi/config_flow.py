"""Choose an outage group in the UI."""
import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.helpers import selector
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from .api import FeedError, fetch_feed
from .const import DOMAIN, GROUPS, selected_groups


def schema(groups=None):
    return vol.Schema({vol.Required("groups", default=groups or ["3.1"]): vol.All(
        selector.SelectSelector(selector.SelectSelectorConfig(
            options=GROUPS, multiple=True, mode=selector.SelectSelectorMode.DROPDOWN)),
        vol.Length(min=1))})


class ConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input=None):
        errors = {}
        if user_input is not None:
            await self.async_set_unique_id(DOMAIN)
            self._abort_if_unique_id_configured()
            try:
                await fetch_feed(async_get_clientsession(self.hass))
            except FeedError:
                errors["base"] = "cannot_connect"
            else:
                return self.async_create_entry(title="Світло · Кропивницький", data=user_input)
        return self.async_show_form(step_id="user", data_schema=schema(), errors=errors)

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        return OptionsFlow()


class OptionsFlow(config_entries.OptionsFlow):
    async def async_step_init(self, user_input=None):
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)
        return self.async_show_form(step_id="init", data_schema=schema(
            selected_groups(self.config_entry.data, self.config_entry.options)))
