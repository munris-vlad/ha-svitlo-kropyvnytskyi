import importlib.util
import pathlib
import sys
import types
import unittest
from datetime import date

ROOT = pathlib.Path(__file__).parents[1] / "custom_components/svitlo_kropyvnytskyi"
package = types.ModuleType("svitlo_test")
package.__path__ = [str(ROOT)]
sys.modules["svitlo_test"] = package
spec = importlib.util.spec_from_file_location("svitlo_test.api", ROOT / "api.py")
api = importlib.util.module_from_spec(spec)
spec.loader.exec_module(api)


def post(text, number=10):
    return {"text": text, "id": number, "published": "2026-11-03T04:14:00+00:00"}


def text(day="03.11.2026", rows="Черга 3.1: 06:00-08:00, 18:00-20:00"):
    return f'{day} - Графік погодинних відключень\nЗа розпорядженням НЕК "Укренерго" {day} буде діяти наступний графік погодинних відключень (ГПВ):\n{rows}'


def html(body, number=10):
    return f'<div class="tgme_widget_message" data-post="SvitloKropyvnytskyiMisto/{number}"><div class="tgme_widget_message_text js-message_text">{body.replace(chr(10),"<br/>")}</div><time datetime="2026-11-03T04:14:00+00:00"></time></div>'


class ParserTests(unittest.TestCase):
    def test_live_format(self):
        schedule = api.parse_feed(html(text()))["2026-11-03"]
        self.assertEqual(schedule["groups"]["3.1"], [[360,480],[1080,1200]])
        self.assertEqual(schedule["groups"]["1.1"], [])

    def test_revision_date_not_header(self):
        value = "Зміни на 23:47 25.10.2026 до графіка погодинних відключень\n" + text("26.10.2026")
        self.assertEqual(api.parse_schedule(post(value))["date"], "2026-10-26")

    def test_latest_revision_and_tomorrow(self):
        feed = html(text(),10) + html(text(rows="Черга 3.1: 10:00-12:00"),12) + html(text("04.11.2026"),13)
        schedules = api.parse_feed(feed)
        days = api.group_days(schedules, "3.1", date(2026,11,3))
        self.assertEqual(days[0]["intervals"], [[600,720]])
        self.assertEqual(days[1]["intervals"], [[360,480],[1080,1200]])

    def test_tomorrow_only_does_not_mean_power_on_today(self):
        days = api.group_days(api.parse_feed(html(text("04.11.2026"))), "3.1", date(2026,11,3))
        self.assertFalse(days[0]["known"])

    def test_midnight(self):
        schedule = api.parse_schedule(post(text(rows="Черга 3.1: 22:00–24:00")))
        self.assertEqual(schedule["groups"]["3.1"], [[1320,1440]])

    def test_merge(self):
        schedule = api.parse_schedule(post(text(rows="Черга 3.1: 10:00-12:00, 11:00-14:00")))
        self.assertEqual(schedule["groups"]["3.1"], [[600,840]])

    def test_invalid_intervals(self):
        for row in ("Черга 3.1: 25:00-26:00", "Черга 3.1: 10:00-09:00", "Черга 3.1: ???", "Черга 3.1: 23:00-24:30"):
            with self.subTest(row=row), self.assertRaises(api.FeedError):
                api.parse_schedule(post(text(rows=row)))

    def test_general_announcement_ignored(self):
        self.assertIsNone(api.parse_schedule(post("З 01.10.2026 розроблено графіки погодинних відключень")))

    def test_cancellation(self):
        value="03.11.2026 Графік погодинних відключень\nГПВ не застосовуються"
        self.assertEqual(api.parse_schedule(post(value))["groups"]["3.1"], [])

    def test_explicit_no_outages(self):
        self.assertEqual(api.parse_schedule(post(text(rows="Черга 3.1: без відключень")))["groups"]["3.1"], [])

    def test_bad_feed(self):
        with self.assertRaises(api.FeedError):
            api.parse_feed("<html>Sign in to Telegram</html>")

    def test_chatter_only_valid_feed(self):
        self.assertEqual(api.parse_feed(html("Нагадуємо передати показники")), {})

    def test_nested_markup_and_edited_post(self):
        feed=html(text(rows="<b>Черга 3.1:</b> 06:00-08:00"))
        self.assertEqual(api.parse_feed(feed)["2026-11-03"]["groups"]["3.1"], [[360,480]])

if __name__ == "__main__":
    unittest.main()
