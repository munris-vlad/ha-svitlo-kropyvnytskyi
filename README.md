# Svitlo · Kropyvnytskyi

Home Assistant integration and dashboard card for electricity outage schedules from the public [Svitlo Kropyvnytskyi Misto Telegram channel](https://t.me/SvitloKropyvnytskyiMisto).

- Choose group 1.1–6.2 in the integration settings.
- Checks the latest public Telegram messages every 60 seconds, including edits.
- Separate schedules for today and tomorrow, with a 24-hour timeline, outage intervals, total duration and the last successful check time in the header.
- Latest revision wins for each schedule date. A tomorrow post never replaces today's schedule.
- Ukrainian, Russian and English interface following Home Assistant language.
- No Telegram login, bot token or API credentials required.
- Bundled card with visual editor and automatic dashboard resource registration.

## Install with HACS

1. HACS → menu → Custom repositories.
2. Add `https://github.com/munris-vlad/ha-svitlo-kropyvnytskyi`, category **Integration**.
3. Download, then restart Home Assistant.
4. Settings → Devices & services → Add integration → **Svitlo · Kropyvnytskyi**.
5. Select your group. Change it later using **Configure** on the integration.
6. Reload the browser, then add the **Світло · Кропивницький** dashboard card.

The card registers automatically in storage-mode dashboards. For YAML-managed resources, add `/svitlo_kropyvnytskyi/frontend/svitlo-card.js?v=0.1.1` as a module.

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
