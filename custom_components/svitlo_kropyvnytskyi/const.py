"""Integration constants."""
DOMAIN = "svitlo_kropyvnytskyi"
CHANNEL = "SvitloKropyvnytskyiMisto"
SOURCE_URL = f"https://t.me/s/{CHANNEL}"
GROUPS = [f"{queue}.{part}" for queue in range(1, 7) for part in (1, 2)]


def selected_groups(data, options=None):
    """Read new settings while preserving legacy single-group entries."""
    options = options or {}
    value = options.get("groups", options.get("group", data.get("groups", data.get("group", "3.1"))))
    if isinstance(value, str):
        value = [value]
    return list(dict.fromkeys(value))
