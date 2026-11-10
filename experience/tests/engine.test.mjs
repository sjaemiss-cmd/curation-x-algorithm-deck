import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {HEADS,DEFAULT_OPTIONS,validateWeights,terms,rank,simulate,offsetScore,diversityMultiplier} from '../engine.mjs';
const zero=()=>Object.fromEntries(Object.keys(HEADS).map(k=>[k,0]));
const o={...DEFAULT_OPTIONS,replyBoost:0,diversity:false};
const c=(id,p,extra={})=>({id,text:id,authorGroup:id,predictions:p,inNetwork:true,...extra});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('Public Rust hand_computed_parity fixture: eligibility, boost, offset, diversity, OON',()=>{
 const w={...zero(),favorite:2,reply:4,retweet:1,dwell:.5,vqv:3,dwell_time:.1,click_dwell_time:.2,post_unexplored:1.5,post_video:2.5,report:-100,not_interested:-10};
 const options={...DEFAULT_OPTIONS,replyBoost:1,dwellBoost:.5,oon:.75,oonRescore:true};
 const data=[c('1',{favorite:.5,reply:.1,dwell:.4,dwell_time:10,post_unexplored:.2,post_video:.04},{authorGroup:'1',mutual:true}),c('2',{favorite:.2,vqv:.9,click_dwell_time:5,post_unexplored:.2},{inNetwork:false,vqvEligible:false}),c('3',{favorite:.05,vqv:.5,click_dwell_time:5},{authorGroup:'1',vqvEligible:true}),c('4',{favorite:.01,report:.05},{isReply:true,mutual:true})];
 const result=rank(data,w,options);assert.deepEqual(result.rows.map(r=>r.id),['1','3','2','4']);
 const values=Object.fromEntries(result.rows.map(r=>[r.id,r.score]));close(values['1'],3.301);close(values['3'],2.601*.625);close(values['2'],1.401*.75);close(values['4'],(-4.98+110)/124.5*.001*.75);
});
test('All 30 terms, conditional products, null as zero and video gates',()=>{
 const w=Object.fromEntries(Object.keys(HEADS).map(k=>[k,1]));const x=c('1',{favorite:null,video_open:.4,home_video_continuation_secs:10,home_profile_visit_secs:20,profile_click:.1,vqv:.9,quoted_vqv:.5},{userVideoContinuationSecs:5});const t=Object.fromEntries(terms(x,w,o).map(t=>[t.key,t.value]));assert.equal(Object.keys(t).length,30);close(t.video_continuation,4);close(t.user_video_continuation,2);close(t.profile_visit_secs,2);close(t.favorite,0);close(t.vqv,0);close(t.quoted_vqv,0);
});
test('Weights flip order with inputs held fixed; counts are irrelevant',()=>{
 const a=c('a',{favorite:.8,share:.05},{likeCount:999999}),b=c('b',{favorite:.3,share:.3});
 assert.deepEqual(rank([a,b],{...zero(),favorite:1,share:1},o).rows.map(r=>r.id),['a','b']);
 assert.deepEqual(rank([a,b],{...zero(),favorite:1,share:4},o).rows.map(r=>r.id),['b','a']);
});
test('Zero totals, negative offsets and diversity boundaries',()=>{
 close(offsetScore(-5,zero()),0);close(offsetScore(5,zero()),5);
 assert.deepEqual([0,1,2,3].map(k=>diversityMultiplier(.5,.25,k)),[1,.625,.4375,.34375]);
 close(diversityMultiplier(0,.25,0),1);close(diversityMultiplier(0,.25,1),.25);
});
test('JSON validation is atomic, rejects unknown, incomplete and invalid numeric weights',()=>{
 assert.deepEqual(validateWeights(zero()),zero());for(const bad of [{},null,[],{...zero(),unknown:1},{...zero(),favorite:NaN},{...zero(),favorite:-1},{...zero(),report:1},{...zero(),share:Infinity},{...zero(),reply:'3'}])assert.throws(()=>validateWeights(bad));
});
test('Exact tie determinism, seen/following/search filters',()=>{
 const a=c('a',{favorite:.4},{text:'Music',inNetwork:false}),b=c('b',{favorite:.4},{text:'Sports'});const w={...zero(),favorite:1};
 assert.deepEqual(rank([b,a],w,o).rows.map(r=>r.id),['a','b']);
 assert.deepEqual(rank([b,a],w,{...o,excludeSeen:true},{seen:new Set(['a'])}).rows.map(r=>r.id),['b']);
 assert.equal(rank([a,b],w,o,{following:true}).rows.length,1);assert.equal(rank([a,b],w,o,{query:'MUSIC'}).rows[0].id,'a');
});
test('10,000 unique real texts; deterministic signals; presets change full-data top 20',async()=>{
 const raw=JSON.parse(await readFile(new URL('../data/posts.json',import.meta.url),'utf8'));const w=JSON.parse(await readFile(new URL('../data/source-defaults.json',import.meta.url),'utf8'));
 assert.equal(raw.length,10000);assert.equal(new Set(raw.map(p=>p.id)).size,10000);assert.equal(new Set(raw.map(p=>p.text)).size,10000);assert.ok(raw.every(p=>Number.isInteger(p.sourceLine)&&p.sourceLine>0));
 const data=raw.map(p=>simulate(p));assert.deepEqual(simulate(raw[0]),simulate(raw[0]));assert.notDeepEqual(simulate(raw[0]),simulate(raw[0],'sports'));
 const before=rank(data,w,DEFAULT_OPTIONS).rows.slice(0,20).map(r=>r.id);const after=rank(data,{...w,favorite:10},DEFAULT_OPTIONS).rows.slice(0,20).map(r=>r.id);assert.notDeepEqual(before,after);assert.ok(data.every(c=>Object.values(c.predictions).every(Number.isFinite)));
});
test('Pre-offset branch leaves negative raw score unscaled',()=>{
 const w={...zero(),favorite:1,report:-100};const data=[c('n',{report:.1},{inNetwork:false})];const r=rank(data,w,{...o,oon:.2,multiplierPreOffset:true}).rows[0];close(r.score,offsetScore(-10,w));
});
