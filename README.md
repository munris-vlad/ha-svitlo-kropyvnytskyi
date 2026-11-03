# Svitlo · Kropyvnytskyi

Home Assistant integration and dashboard card for electricity outage schedules from the public [Svitlo Kropyvnytskyi Misto Telegram channel](https://t.me/SvitloKropyvnytskyiMisto).

- Choose one or more groups from 1.1–6.2 in the integration settings.
- Checks the latest public Telegram messages every 60 seconds, including edits.
- Switch between today and tomorrow (today is selected by default), with a 24-hour timeline, outage intervals, total duration and the last successful check time in the header.
- Latest revision wins for each schedule date. A tomorrow post never replaces today's schedule.
- Ukrainian, Russian and English interface following Home Assistant language.
- No Telegram login, bot token or API credentials required.
- Bundled card with visual editor and automatic dashboard resource registration.

## Install with HACS

1. HACS → menu → Custom repositories.
2. Add `https://github.com/munris-vlad/ha-svitlo-kropyvnytskyi`, category **Integration**.
3. Download, then restart Home Assistant.
4. Settings → Devices & services → Add integration → **Svitlo · Kropyvnytskyi**.
5. Select one or more groups. Change it later using **Configure** on the integration.
6. Reload the browser, then add the **Світло · Кропивницький** dashboard card.

The card registers automatically in storage-mode dashboards. For YAML-managed resources, add `/svitlo_kropyvnytskyi/frontend/svitlo-card.js?v=0.2.5` as a module.

```yaml
type: custom:svitlo-card
entity: sensor.svitlo_kropivnitskii_schedule
```

Choose the actual sensor using the visual editor; its generated entity ID can differ. Manual installation: copy `custom_components/svitlo_kropyvnytskyi` into `/config/custom_components`, restart and follow steps 4–6. Home Assistant 2026.6 or newer is required.

## Meaning and limitations

All dates, intervals and the current-time marker use **Europe/Kyiv** regardless of browser time zone. The status is the **planned** electricity state, not a measurement of actual grid power. Emergency cuts may differ from this schedule.

The parser reads dated text schedules headed `Графік погодинних відключень` and subsequent revisions, with `Черга 3.1: 06:00-08:00, …` rows. For a recognized complete schedule, omitted groups have no planned outages. An absent dated schedule is shown as **not published**, never as uninterrupted power. Generic announcements do not clear a schedule. Explicit dated cancellations are supported. Malformed intervals produce an update error rather than reporting power on.

If Telegram fails, the sensor becomes unavailable and the card displays an error, retaining the last known intervals and last successful check time. The last schedules are cached across restarts. Public Telegram HTML is not a stable API; layout or message-format changes may require an update. Schedule data consists only of public messages. No personal Telegram data is accessed.

This repository is suitable for installation as a **custom HACS repository**. Inclusion in the default HACS catalog is a separate review process and is not implied.

## Development

```sh
pip install aiohttp tzdata
python -m unittest discover -s tests -v
node --check custom_components/svitlo_kropyvnytskyi/frontend/svitlo-card.js
```

MIT license. Independent community integration.

Select several groups in the integration options to show group buttons above the day switcher. Each group has its own status and intervals. All groups share one Telegram request per minute. Existing single-group settings are preserved. The sensor state and legacy `days` attribute describe the first selected group; `queues` contains the individual statuses and schedules for all selected groups.

You can add the integration multiple times, including entries with overlapping groups. Each entry has independent group settings and a separate sensor. Add a card for each entry and select its sensor in the card editor. New entries include their initial groups in the title and can be renamed in Home Assistant. Existing entries and cards are kept.

Completed outage intervals are shown in gray on the timeline and muted in the interval list. Current and future outages keep their normal highlight. Completion is evaluated in Kyiv time when the card updates.

The outer surface uses the standard Home Assistant `ha-card` theme styling. Inner surfaces are transparent tints derived from the active theme text/accent colors, so dashboard backgrounds and light/dark themes remain consistent. No fixed palette or fixed black button shadow is applied. Theme changes update the colors through inherited CSS variables.
