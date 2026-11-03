const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
class Element {
  constructor(tag='host'){this.tag=tag;this.children=[];this.style={};this.attributes={};}
  attachShadow(){this.shadowRoot=new Element('shadow');return this.shadowRoot;}
  append(...items){this.children.push(...items);}
  replaceChildren(...items){this.children=items;}
  setAttribute(key,value){this.attributes[key]=value;}
  addEventListener(name,handler){this.listeners??={};this.listeners[name]=handler;}
  click(){this.listeners?.click?.();}
  focus(){this.focused=true;}
  querySelectorAll(selector){return descendants(this).filter(node=>node.className===selector.split(' ')[0].slice(1)).flatMap(node=>node.children.filter(child=>child.tag==='button'));}
  get text(){return [this.textContent || '',...this.children.map(c=>c.text)].join(' ');}
}
const registry=new Map();
const context={HTMLElement:Element,document:{createElement:tag=>new Element(tag)},customElements:{get:key=>registry.get(key),define:(key,value)=>registry.set(key,value)},window:{},Intl,Date,CustomEvent:class{}};
vm.runInNewContext(fs.readFileSync('custom_components/svitlo_kropyvnytskyi/frontend/svitlo-card.js','utf8'),context);
const Card=registry.get('svitlo-card');
function make(state='scheduled_off',known=true,language='ru'){
 const card=new Card();card.setConfig({entity:'sensor.test'});
 card.hass={language,states:{'sensor.test':{state,attributes:{group:'3.1',timezone:'Europe/Kyiv',checked_at:'2026-11-03T12:00:00+02:00',days:[{date:'2026-11-03',known,intervals:known?[[360,480]]:[],source:'https://t.me/SvitloKropyvnytskyiMisto/1735'},{date:'2026-11-04',known:false,intervals:[]}]}}}};
 return card;
}
test('shows selected group, today, tomorrow and intervals',()=>{
 const text=make().shadowRoot.text;
 assert.match(text,/Группа 3.1/);assert.match(text,/Сегодня/);assert.match(text,/Завтра/);assert.match(text,/06:00–08:00/);
});
test('unavailable displays update error',()=>assert.match(make('unavailable').shadowRoot.text,/Не удалось обновить/));
test('missing schedule does not claim power is on',()=>{
 const text=make('no_schedule',false).shadowRoot.text;assert.match(text,/Нет графика/);assert.doesNotMatch(text,/Сейчас по графику есть свет/);
});
test('localizes Ukrainian and English',()=>{
 assert.match(make('scheduled_on',true,'uk').shadowRoot.text,/Сьогодні/);assert.match(make('scheduled_on',true,'en').shadowRoot.text,/Today/);
});
test('renders custom titles as text',()=>{const c=make();c.setConfig({entity:'sensor.test',title:'<img onerror=alert(1)>'});assert.match(c.shadowRoot.text,/<img onerror=alert/);});
test('registers card once',()=>assert.equal(context.window.customCards.length,1));
function descendants(node){return [node,...node.children.flatMap(descendants)];}
test('puts last successful check in the header and removes footer and links',()=>{
 const card=make(),nodes=descendants(card.shadowRoot);
 const head=nodes.find(node=>node.className==='head');
 assert.match(head.text,/Проверено: 12:00/);
 assert.equal(nodes.some(node=>node.tag==='a' || node.className==='footer'),false);
 assert.doesNotMatch(card.shadowRoot.text,/Плановый график|время Киева|Сообщение в Telegram/);
});
test('uses HA language for title, check label, duration, and editor',()=>{
 for(const [language,title,checked,hours,entity] of [['uk-UA','Графік відключень','Перевірено','год','Сенсор графіка'],['en-GB','Power outage schedule','Checked','h','Schedule sensor']]){
  const card=make('scheduled_on',true,language);
  assert.ok(card.shadowRoot.text.includes(title));assert.ok(card.shadowRoot.text.includes(checked));assert.ok(card.shadowRoot.text.includes(`2 ${hours}`));
  const Editor=registry.get('svitlo-card-editor'),editor=new Editor();editor.setConfig({entity:'sensor.test'});editor.hass=card._hass;
  assert.equal(editor.shadowRoot.children[0].computeLabel({name:'entity'}),entity);
 }
});
test('changes language when HA language changes',()=>{
 const card=make();card.hass={...card._hass,language:'uk'};assert.match(card.shadowRoot.text,/Перевірено/);assert.doesNotMatch(card.shadowRoot.text,/Проверено/);
});
test('shows only today by default and switches to tomorrow',()=>{
 const card=make();
 const days=()=>descendants(card.shadowRoot).filter(node=>node.className==='day');
 assert.equal(days().length,1);assert.match(days()[0].text,/03.11.2026/);
 card.shadowRoot.querySelectorAll('.day-switch button')[1].click();
 assert.equal(days().length,1);assert.match(days()[0].text,/04.11.2026/);assert.match(days()[0].text,/ещё не опубликован/);
 assert.equal(card.shadowRoot.querySelectorAll('.day-switch button')[1].attributes['aria-pressed'],'true');
 assert.equal(card.shadowRoot.querySelectorAll('.day-switch button')[1].focused,true);
 card.shadowRoot.querySelectorAll('.day-switch button')[0].click();assert.match(days()[0].text,/03.11.2026/);
});
test('keeps the selected day through polling and language changes',()=>{
 const card=make();card.shadowRoot.querySelectorAll('.day-switch button')[1].click();
 card.hass={...card._hass,language:'en'};
 const day=descendants(card.shadowRoot).find(node=>node.className==='day');
 assert.match(day.text,/Tomorrow/);assert.match(day.text,/04.11.2026/);assert.doesNotMatch(day.text,/03.11.2026/);
});
test('returns to today when the calendar date rolls over',()=>{
 const card=make();card.shadowRoot.querySelectorAll('.day-switch button')[1].click();
 card._hass.states['sensor.test'].attributes.days=[{date:'2026-11-04',known:false,intervals:[]},{date:'2026-11-05',known:false,intervals:[]}];
 card.hass=card._hass;
 assert.equal(card.shadowRoot.querySelectorAll('.day-switch button')[0].attributes['aria-pressed'],'true');
 assert.match(descendants(card.shadowRoot).find(node=>node.className==='day').text,/Сегодня/);
});
test('switches groups independently and retains the selected day',()=>{
 const card=make(),hass=card._hass;
 hass.states['sensor.test'].attributes.queues=[
  {group:'3.1',state:'scheduled_off',days:[{date:'2026-11-03',known:true,intervals:[[360,480]]},{date:'2026-11-04',known:true,intervals:[[600,720]]}]},
  {group:'4.2',state:'scheduled_on',days:[{date:'2026-11-03',known:true,intervals:[[840,960]]},{date:'2026-11-04',known:true,intervals:[[1080,1200]]}]}
 ];card.hass=hass;
 card.shadowRoot.querySelectorAll('.day-switch button')[1].click();
 card.shadowRoot.querySelectorAll('.group-switch button')[1].click();
 assert.match(card.shadowRoot.text,/Группа 4.2/);assert.match(card.shadowRoot.text,/Сейчас по графику есть свет/);
 assert.match(card.shadowRoot.text,/18:00–20:00/);assert.doesNotMatch(card.shadowRoot.text,/10:00–12:00/);
 card.hass={...hass,language:'uk'};assert.match(card.shadowRoot.text,/Черга 4.2/);
 hass.states['sensor.test'].attributes.queues=hass.states['sensor.test'].attributes.queues.slice(0,1);card.hass=hass;
 assert.match(card.shadowRoot.text,/Группа 3.1/);assert.match(card.shadowRoot.text,/10:00–12:00/);
});
test('global feed failure overrides a selected queue status',()=>{
 const card=make('unavailable');card._hass.states['sensor.test'].attributes.queues=[{group:'3.1',state:'scheduled_on',days:card._hass.states['sensor.test'].attributes.days}];card.hass=card._hass;
 assert.match(card.shadowRoot.text,/Не удалось обновить/);assert.doesNotMatch(card.shadowRoot.text,/Сейчас по графику есть свет/);
});
test('hiding day buttons returns to today and persists on updates',()=>{
 const card=make();card.shadowRoot.querySelectorAll('.day-switch button')[1].click();
 card.setConfig({entity:'sensor.test',show_day_switch:false});
 assert.equal(card.shadowRoot.querySelectorAll('.day-switch button').length,0);
 assert.match(descendants(card.shadowRoot).find(node=>node.className==='day').text,/Сегодня/);
 card.hass=card._hass;assert.equal(card.shadowRoot.querySelectorAll('.day-switch button').length,0);
 card.setConfig({entity:'sensor.test',show_day_switch:true});
 assert.equal(card.shadowRoot.querySelectorAll('.day-switch button').length,2);
});
test('editor exposes localized day switch option enabled by default',()=>{
 const Editor=registry.get('svitlo-card-editor');
 for(const [language,label] of [['ru','Показывать кнопки Сегодня/Завтра'],['uk','Показувати кнопки Сьогодні/Завтра'],['en','Show Today/Tomorrow buttons']]){
  const editor=new Editor();editor.setConfig({entity:'sensor.test'});editor.hass={language};
  const form=editor.shadowRoot.children[0];
  assert.equal(form.data.show_day_switch,true);
  assert.ok(form.schema.find(field=>field.name==='show_day_switch').selector.boolean);
  assert.equal(form.computeLabel({name:'show_day_switch'}),label);
 }
});
test('background transparency changes only the card surface and retains theme defaults',()=>{
 const card=make(),surface=()=>descendants(card.shadowRoot).find(node=>node.tag==='ha-card');
 assert.equal(surface().style.background,undefined);
 card.setConfig({entity:'sensor.test',background_transparency:40});
 assert.match(surface().style.background,/var\(--card-background-color/);assert.match(surface().style.background,/60%/);
 assert.equal(surface().style.opacity,undefined);
 card.setConfig({entity:'sensor.test',background_transparency:100});assert.equal(surface().style.background,'transparent');
 card.setConfig({entity:'sensor.test',background_transparency:'invalid'});assert.equal(surface().style.background,undefined);
});
