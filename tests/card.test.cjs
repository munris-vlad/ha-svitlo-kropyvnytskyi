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
  addEventListener(){}
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
