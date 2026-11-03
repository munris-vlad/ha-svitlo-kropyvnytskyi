"""Integration constants."""
DOMAIN = "svitlo_kropyvnytskyi"
CHANNEL = "SvitloKropyvnytskyiMisto"
SOURCE_URL = f"https://t.me/s/{CHANNEL}"
GROUPS = [f"{queue}.{part}" for queue in range(1, 7) for part in (1, 2)]
