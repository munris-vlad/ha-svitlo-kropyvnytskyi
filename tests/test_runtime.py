"""Validate HA selectors and independent queue data in a real HA runtime."""
import importlib.util
from types import SimpleNamespace
import unittest

HAS_HA = importlib.util.find_spec("homeassistant") is not None


@unittest.skipUnless(HAS_HA, "Requires Home Assistant runtime")
class RuntimeTests(unittest.TestCase):
    def test_multiselect_rejects_empty_and_accepts_multiple(self):
        from custom_components.svitlo_kropyvnytskyi.config_flow import schema
        import voluptuous as vol
        self.assertEqual(schema()({"groups": ["3.1", "4.2"]}), {"groups": ["3.1", "4.2"]})
        with self.assertRaises(vol.Invalid):
            schema()({"groups": []})
        with self.assertRaises(vol.Invalid):
            schema()({"groups": ["9.9"]})

    def test_queue_sensor_preserves_legacy_attributes(self):
        from datetime import datetime
        from custom_components.svitlo_kropyvnytskyi import KYIV
        from custom_components.svitlo_kropyvnytskyi.sensor import ScheduleSensor
        from custom_components.svitlo_kropyvnytskyi.const import GROUPS
        today = datetime.now(KYIV).date().isoformat()
        schedules = {today: {"groups": {group: ([[0,1440]] if group == "3.1" else []) for group in GROUPS}, "source": "https://t.me/SvitloKropyvnytskyiMisto/1", "published": None}}
        coordinator = SimpleNamespace(group="3.1", groups=["3.1", "4.2"], schedules=schedules,
                                      data={"checked_at": "2026-11-03T12:00:00+02:00"})
        sensor = ScheduleSensor(coordinator, SimpleNamespace(entry_id="test"))
        attributes = sensor.extra_state_attributes
        self.assertEqual(attributes["groups"], ["3.1", "4.2"])
        self.assertEqual(attributes["queues"][0]["state"], "scheduled_off")
        self.assertEqual(attributes["queues"][1]["state"], "scheduled_on")
        self.assertEqual(attributes["days"], attributes["queues"][0]["days"])
        self.assertEqual(sensor.native_value, "scheduled_off")
