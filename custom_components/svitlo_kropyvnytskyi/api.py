"""Read public Telegram posts and parse dated schedule revisions."""
from datetime import date, datetime, timedelta
from html.parser import HTMLParser
import re

import aiohttp

from .const import CHANNEL, GROUPS, SOURCE_URL


class FeedError(Exception):
    """The public feed is unavailable or no longer has the expected format."""


class FeedParser(HTMLParser):
    """Extract text only from message bodies, including edited posts."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.posts = []
        self.post = None
        self.depth = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = attrs.get("class", "").split()
        if "tgme_widget_message" in classes and attrs.get("data-post", "").startswith(CHANNEL + "/"):
            self.post = {"id": int(attrs["data-post"].split("/")[-1]), "text": "", "published": None}
            self.posts.append(self.post)
        if self.post is not None and tag == "time":
            self.post["published"] = attrs.get("datetime")
        if "tgme_widget_message_text" in classes:
            self.depth = 1
        elif self.depth and tag not in {"br", "img", "hr", "wbr", "input", "meta", "link"}:
            self.depth += 1
        if self.depth and tag == "br":
            self.post["text"] += "\n"

    def handle_endtag(self, tag):
        if tag in {"br", "img", "hr", "wbr", "input", "meta", "link"}:
            return
        if self.depth:
            if tag in {"div", "p"}:
                self.post["text"] += "\n"
            self.depth -= 1

    def handle_data(self, data):
        if self.depth and self.post is not None:
            self.post["text"] += data


DATE = re.compile(r"(?<!\d)(\d{2})\.(\d{2})\.(\d{4})(?!\d)")
GROUP = re.compile(r"(?:Черга|Група|Очередь)\s*([1-6][.,][12])\s*:\s*([^\n]*)", re.I)
INTERVAL = re.compile(
    r"(?<![\d:.])(\d{1,2})(?:[:.](\d{2}))?\s*[-–—−]\s*"
    r"(\d{1,2})(?:[:.](\d{2}))?(?![\d:.])"
)


def parse_schedule(post):
    text = post["text"].replace("\xa0", " ")
    if not re.search(r"(?:графік|графіка|графику|график).*?(?:відключ|отключ)", text, re.I | re.S):
        return None
    # The header can mention yesterday's revision time. The dispatch sentence
    # carries the date to which the schedule actually applies.
    dispatch = re.search(r"За розпорядженням[^\n]*", text, re.I)
    if dispatch:
        line_start = text.rfind("\n", 0, dispatch.start()) + 1
        prefix = text[line_start:dispatch.start()].strip()
        prefix = re.sub(r"^на\s+", "", prefix, flags=re.I)
        match = DATE.fullmatch(prefix) or DATE.search(dispatch.group())
    else:
        match = DATE.search(text)
    if not match:
        return None
    try:
        day = date(int(match[3]), int(match[2]), int(match[1]))
    except ValueError:
        return None
    rows = list(GROUP.finditer(text))
    if not rows:
        # Do not interpret a general announcement as a cancellation.
        if not re.search(r"(?:ГПВ|графік[^\n]*відключень)[^\n]*(?:не застосов|скасовано|не буде застосов)", text, re.I):
            return None
    groups = {group: [] for group in GROUPS}
    for row in rows:
        spans = []
        if INTERVAL.search(row[2]) and INTERVAL.sub("", row[2]).strip(" ,;."):
            raise FeedError("Unrecognized text in schedule intervals")
        for interval in INTERVAL.finditer(row[2]):
            h1, m1, h2, m2 = (int(value or 0) for value in interval.groups())
            if h1 > 23 or m1 > 59 or h2 > 24 or m2 > 59 or (h2 == 24 and m2):
                raise FeedError("Invalid schedule time")
            start, end = h1 * 60 + m1, h2 * 60 + m2
            if end == 0:
                end = 1440
            if end <= start:
                raise FeedError("Invalid schedule interval")
            spans.append((start, end))
        if not spans and not re.search(r"не (?:передбач|застосов|буде)|без відключ|відсут|скасован|^\s*[-–—]\s*$", row[2], re.I):
            raise FeedError("Unrecognized group schedule")
        # Merge overlapping intervals so totals and timeline stay consistent.
        merged = []
        for start, end in sorted(set(spans)):
            if merged and start <= merged[-1][1]:
                merged[-1][1] = max(end, merged[-1][1])
            else:
                merged.append([start, end])
        groups[row[1].replace(",", ".")] = merged
    return {"date": day.isoformat(), "groups": groups, "message_id": post["id"],
            "source": f"https://t.me/{CHANNEL}/{post['id']}", "published": post["published"]}


def parse_feed(html):
    parser = FeedParser()
    parser.feed(html)
    if not parser.posts:
        raise FeedError("Telegram did not return a public message feed")
    schedules = {}
    for post in sorted(parser.posts, key=lambda item: item["id"]):
        schedule = parse_schedule(post)
        if schedule:
            schedules[schedule["date"]] = schedule
    return schedules


async def fetch_feed(session):
    try:
        async with session.get(SOURCE_URL, timeout=aiohttp.ClientTimeout(total=25)) as response:
            response.raise_for_status()
            return parse_feed(await response.text())
    except (aiohttp.ClientError, TimeoutError) as err:
        raise FeedError("Cannot read Telegram") from err


def group_days(schedules, group, today):
    result = []
    for offset in (0, 1):
        day = today + timedelta(days=offset)
        schedule = schedules.get(day.isoformat())
        result.append({"date": day.isoformat(), "known": schedule is not None,
                       "intervals": schedule["groups"][group] if schedule else [],
                       "source": schedule["source"] if schedule else None,
                       "published": schedule["published"] if schedule else None})
    return result
