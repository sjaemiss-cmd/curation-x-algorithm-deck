import {test} from 'node:test';import assert from 'node:assert/strict';
import {joinTranslations} from '../translations.mjs';
import {readFile} from 'node:fs/promises';
import * as x from '../engine.mjs';import * as twitter from '../twitter-engine.mjs';
const posts=[{id:'a',text:'Football music today?',sourceLine:1},{id:'b',text:'This is a test.',sourceLine:2}];
const ko=[{id:'b',text_ko:'테스트입니다.'},{id:'a',text_ko:'오늘 축구와 음악?'}];
test('Translations join by ID, retain original order and text; do not mutate originals',()=>{const before=JSON.stringify(posts);const joined=joinTranslations(posts,ko);assert.deepEqual(joined.map(p=>p.id),['a','b']);assert.equal(joined[0].text_ko,'오늘 축구와 음악?');assert.equal(joined[0].text,posts[0].text);assert.equal(JSON.stringify(posts),before);});
test('Translation import fails closed for incomplete, duplicate, extra or empty entries',()=>{for(const input of [null,[],ko.slice(1),[ko[0],ko[0]],[ko[0],{id:'c',text_ko:'글'}],[ko[0],{id:'a',text_ko:' '}],{}])assert.throws(()=>joinTranslations(posts,input));});
test('Korean presentation never changes either era predictions and rankings',()=>{const translated=joinTranslations(posts,ko);for(const engine of [twitter,x]){const w=Object.fromEntries(Object.keys(engine.HEADS).map(k=>[k,engine.NEG.includes(k)?-1:1]));for(const persona of ['balanced','sports','music']){const old=posts.map(p=>engine.simulate(p,persona)),next=translated.map(p=>engine.simulate(p,persona));assert.deepEqual(old.map(p=>p.predictions),next.map(p=>p.predictions));assert.deepEqual(engine.rank(old,w).rows.map(r=>[r.id,r.score]),engine.rank(next,w).rows.map(r=>[r.id,r.score]));assert.equal(engine.rank(next,w,engine.DEFAULT_OPTIONS,{query:'축구'}).rows[0].id,'a');assert.equal(engine.rank(next,w,engine.DEFAULT_OPTIONS,{query:'football'}).rows[0].id,'a');}}});
test('All 10000 final translations are complete and preserve every ranked score in both eras',async()=>{
 const read=async name=>JSON.parse(await readFile(new URL('../data/'+name,import.meta.url),'utf8'));
 const raw=await read('posts.json'),translations=await read('posts.ko.json');assert.equal(translations.length,10000);
 const joined=joinTranslations(raw,translations);assert.equal(joined.length,10000);assert.ok(joined.every(p=>/[가-힣]/.test(p.text_ko)));
 for(const [engine,file] of [[twitter,'twitter-2023-defaults.json'],[x,'source-defaults.json']]){
  const w=await read(file);for(const persona of ['balanced','sports','music']){
   const before=engine.rank(raw.map(p=>engine.simulate(p,persona)),w).rows.map(r=>[r.id,r.score]);
   const after=engine.rank(joined.map(p=>engine.simulate(p,persona)),w).rows.map(r=>[r.id,r.score]);assert.deepEqual(after,before);
  }
 }
});
