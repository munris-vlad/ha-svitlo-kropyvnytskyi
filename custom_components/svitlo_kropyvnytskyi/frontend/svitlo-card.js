const WORDS = {
  ru: {title:"График отключений",group:"Группа",groups:"Очереди",day:"День графика",today:"Сегодня",tomorrow:"Завтра",missing:"График ещё не опубликован",none:"Отключения не запланированы",off:"Сейчас по графику отключение",on:"Сейчас по графику есть свет",error:"Не удалось обновить данные Telegram",checked:"Проверено",hours:"ч",entity:"Датчик графика",name:"Заголовок",settings:"Группа меняется в настройках интеграции «Світло · Кропивницький»",empty:"Добавьте интеграцию «Світло · Кропивницький»",planned:"Отключения",unknown:"Нет графика на сегодня"},
  uk: {title:"Графік відключень",group:"Черга",groups:"Черги",day:"День графіка",today:"Сьогодні",tomorrow:"Завтра",missing:"Графік ще не опубліковано",none:"Відключення не заплановані",off:"Зараз за графіком відключення",on:"Зараз за графіком є світло",error:"Не вдалося оновити дані Telegram",checked:"Перевірено",hours:"год",entity:"Сенсор графіка",name:"Заголовок",settings:"Черга змінюється в налаштуваннях інтеграції «Світло · Кропивницький»",empty:"Додайте інтеграцію «Світло · Кропивницький»",planned:"Відключення",unknown:"Немає графіка на сьогодні"},
  en: {title:"Power outage schedule",group:"Group",groups:"Groups",day:"Schedule day",today:"Today",tomorrow:"Tomorrow",missing:"Schedule not published yet",none:"No outages scheduled",off:"Outage scheduled now",on:"Power scheduled on now",error:"Could not update Telegram data",checked:"Checked",hours:"h",entity:"Schedule sensor",name:"Title",settings:"Change the group in the Svitlo integration options",empty:"Add the Svitlo · Kropyvnytskyi integration",planned:"Outages",unknown:"No schedule for today"}
};
const words = hass => WORDS[(hass?.language || "en").split("-")[0]] || WORDS.en;
const clock = minute => `${String(Math.floor(minute / 60)).padStart(2,"0")}:${String(minute % 60).padStart(2,"0")}`;
const el = (tag, text, cls) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (cls) node.className = cls; return node; };
const sensors = hass => Object.keys(hass?.states || {}).filter(id => id.startsWith("sensor.") && hass.states[id].attributes.timezone === "Europe/Kyiv" && Array.isArray(hass.states[id].attributes.days));

class SvitloCard extends HTMLElement {
  static getConfigElement() { return document.createElement("svitlo-card-editor"); }
  static getStubConfig(hass) { return {entity:sensors(hass)[0] || ""}; }
  constructor() { super(); this.attachShadow({mode:"open"}); this.selectedDay = 0; }
  setConfig(config) { this.config = {...config}; this.render(); }
  set hass(hass) { this._hass = hass; this.render(); }
  getCardSize() { return 5; }
  getGridOptions() { return {columns:12,rows:"auto",min_columns:6,min_rows:4}; }
  render() {
    if (!this._hass || !this.config) return;
    const w = words(this._hass), state = this._hass.states[this.config.entity || sensors(this._hass)[0]];
    const queues = state?.attributes.queues || [];
    if (!queues.some(queue => queue.group === this.selectedGroup)) this.selectedGroup = queues[0]?.group;
    const queue = queues.find(queue => queue.group === this.selectedGroup);
    const currentState = ["unavailable","unknown"].includes(state?.state) ? state?.state : queue?.state || state?.state;
    const root = this.shadowRoot; root.replaceChildren();
    const style = el("style");
    style.textContent = `:host{--svitlo-surface:color-mix(in srgb,var(--primary-text-color) 6%,transparent);--svitlo-selected-surface:color-mix(in srgb,var(--primary-color) 14%,transparent)}ha-card{padding:20px;overflow:hidden}.head{display:flex;align-items:center;justify-content:space-between;gap:12px}.title{font-size:19px;font-weight:600}.badge{border-radius:14px;background:var(--svitlo-surface);padding:5px 10px;white-space:nowrap;font-size:13px}.status-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:14px}.status{display:flex;gap:6px;align-items:center;font-size:12px;min-width:0}.status>span:last-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dot{flex-shrink:0;width:9px;height:9px;border-radius:50%;background:var(--success-color)}.off .dot{background:var(--warning-color)}.error{color:var(--error-color)}.day{margin-top:18px}.group-switch{display:flex;gap:6px;flex-wrap:wrap;margin-top:14px}.group-switch button{border:1px solid var(--divider-color);border-radius:8px;padding:7px 12px;background:transparent;color:var(--secondary-text-color);font:inherit;cursor:pointer}.group-switch button[aria-pressed="true"]{border-color:var(--primary-color);color:var(--primary-color);font-weight:600}.group-switch button:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}.day-switch{flex-shrink:0;display:inline-flex;gap:2px;padding:3px;border-radius:8px;background:var(--svitlo-surface)}.day-switch button{flex:0 0 auto;min-width:76px;border:0;border-radius:5px;padding:5px 10px;background:transparent;color:var(--secondary-text-color);font:inherit;font-size:12px;cursor:pointer}.day-switch button[aria-pressed="true"]{background:var(--svitlo-selected-surface);color:var(--primary-color);font-weight:600}.day-switch button:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}.date{font-weight:600;font-size:14px;display:flex;justify-content:space-between;gap:8px}.muted{color:var(--secondary-text-color);font-size:12px}.track{height:24px;position:relative;border-radius:6px;background:var(--svitlo-surface);margin-top:12px;overflow:hidden}.segment{position:absolute;height:100%;background:var(--warning-color)}.segment.past{background:var(--disabled-text-color,var(--secondary-text-color))}.interval.past{color:var(--secondary-text-color);opacity:.65}.ticks{display:flex;justify-content:space-between;font-size:10px;color:var(--secondary-text-color);margin-top:4px}.intervals{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.interval{font-size:12px;padding:4px 7px;border-radius:5px;background:var(--svitlo-surface)}.checked{margin-top:5px}.notice{margin:10px 0;font-size:13px}.marker{position:absolute;height:100%;width:2px;background:var(--primary-text-color);z-index:1}`;
    root.append(style);
    const card = el("ha-card"), head = el("div",undefined,"head");
    const heading = el("div");
    heading.append(el("div",this.config.title || w.title,"title"));
    if (state?.attributes.checked_at) heading.append(el("div",`${w.checked}: ${new Intl.DateTimeFormat(this._hass.language || "en",{timeZone:"Europe/Kyiv",hour:"2-digit",minute:"2-digit"}).format(new Date(state.attributes.checked_at))}`,"muted checked"));
    head.append(heading);
    if (state) head.append(el("span",`${w.group} ${queue?.group || state.attributes.group}`,"badge"));
    card.append(head); root.append(card);
    if (!state) {card.append(el("p",w.empty,"notice")); return;}
    const a = state.attributes, unavailable = ["unavailable","unknown"].includes(currentState);
    if (queues.length > 1) {
      const groups = el("div",undefined,"group-switch");
      groups.setAttribute("role","group"); groups.setAttribute("aria-label",w.groups);
      queues.forEach(item => {
        const button = el("button",item.group);
        button.type = "button"; button.setAttribute("aria-pressed",String(item.group === this.selectedGroup));
        button.addEventListener("click",() => {
          this.selectedGroup = item.group; this.render();
          [...this.shadowRoot.querySelectorAll(".group-switch button")].find(node => node.textContent === item.group)?.focus();
        });
        groups.append(button);
      });
      card.append(groups);
    }
    const status = el("div",undefined,`status ${currentState === "scheduled_off" ? "off" : ""}`);
    if (!unavailable && currentState !== "no_schedule") status.append(el("span",undefined,"dot"));
    const statusLabel = unavailable ? w.error : currentState === "no_schedule" ? w.unknown : currentState === "scheduled_off" ? w.off : w.on;
    status.append(el("span",statusLabel,unavailable ? "error" : ""));
    status.setAttribute("title",statusLabel);
    const statusRow = el("div",undefined,"status-row");
    statusRow.append(status);
    const days = queue?.days || a.days || [];
    const now = Object.fromEntries(new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Kyiv",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date()).map(part => [part.type,part.value]));
    const currentDate = `${now.year}-${now.month}-${now.day}`;
    const currentMinute = Number(now.hour) * 60 + Number(now.minute);
    const completed = (date,end) => date < currentDate || (date === currentDate && end <= currentMinute);
    if (this.dayAnchor !== days[0]?.date) {
      this.dayAnchor = days[0]?.date;
      this.selectedDay = 0;
    }
    const switcher = el("div",undefined,"day-switch");
    switcher.setAttribute("role","group");
    switcher.setAttribute("aria-label",w.day);
    [w.today,w.tomorrow].forEach((label,index) => {
      const button = el("button",label);
      button.type = "button";
      button.setAttribute("aria-pressed",String(this.selectedDay === index));
      button.addEventListener("click",() => {
        this.selectedDay = index;
        this.render();
        this.shadowRoot.querySelectorAll(".day-switch button")[index]?.focus();
      });
      switcher.append(button);
    });
    statusRow.append(switcher);
    card.append(statusRow);
    days.forEach((day,index) => {
      if (index !== this.selectedDay) return;
      const section = el("div",undefined,"day"), date = el("div",undefined,"date");
      date.append(el("span",`${index === 0 ? w.today : w.tomorrow} · ${day.date.split("-").reverse().join(".")}`));
      const intervals = day.intervals || [];
      if (day.known) date.append(el("span",`${Math.round(intervals.reduce((sum,[s,e])=>sum+e-s,0)/6)/10} ${w.hours}`,"muted"));
      section.append(date);
      if (!day.known) section.append(el("p",w.missing,"muted"));
      else {
        const track = el("div",undefined,"track"); track.setAttribute("role","img");
        track.setAttribute("aria-label",`${w.planned}: ${intervals.length ? intervals.map(([s,e])=>`${clock(s)}–${clock(e)}`).join(", ") : w.none}`);
        intervals.forEach(([start,end])=>{const span=el("div",undefined,completed(day.date,end) ? "segment past" : "segment"); span.style.left=`${start/14.4}%`;span.style.width=`${(end-start)/14.4}%`;track.append(span);});
        if(day.date === currentDate) {const marker=el("div",undefined,"marker");marker.style.left=`${currentMinute/14.4}%`;track.append(marker);}
        section.append(track); const ticks=el("div",undefined,"ticks"); [0,6,12,18,24].forEach(h=>ticks.append(el("span",`${String(h).padStart(2,"0")}:00`)));section.append(ticks);
        const list=el("div",undefined,"intervals");
        if(!intervals.length) list.append(el("span",w.none,"muted"));
        intervals.forEach(([s,e])=>list.append(el("span",`${clock(s)}–${clock(e)}`,completed(day.date,e) ? "interval past" : "interval")));
        section.append(list);
      }
      card.append(section);
    });
  }
}

class SvitloEditor extends HTMLElement {
  constructor(){super();this.attachShadow({mode:"open"});}
  setConfig(config){this.config={...config};this.render();}
  set hass(hass){this._hass=hass;this.render();}
  render(){
    if(!this.config || !this._hass)return;
    const w=words(this._hass);this.shadowRoot.replaceChildren();
    const form=el("ha-form");form.hass=this._hass;form.data=this.config;
    form.schema=[{name:"entity",required:true,selector:{entity:{domain:"sensor",integration:"svitlo_kropyvnytskyi"}}},{name:"title",selector:{text:{}}}];
    form.computeLabel=field=>field.name==="entity"?w.entity:w.name;
    form.addEventListener("value-changed",event=>{this.config={...this.config,...event.detail.value};this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this.config},bubbles:true,composed:true}));});
    this.shadowRoot.append(form,el("p",w.settings));
  }
}
if(!customElements.get("svitlo-card"))customElements.define("svitlo-card",SvitloCard);
if(!customElements.get("svitlo-card-editor"))customElements.define("svitlo-card-editor",SvitloEditor);
window.customCards=window.customCards || [];
if(!window.customCards.some(c=>c.type==="svitlo-card"))window.customCards.push({type:"svitlo-card",name:"Світло · Кропивницький",description:"Electricity outage schedule from Telegram · Today and tomorrow",preview:true});
