import {simulate as commonSimulate,seedOf,diversityMultiplier} from './engine.mjs';
export const HEADS={favorite:'좋아요',retweet:'리트윗',reply:'답글',good_profile_click:'프로필 열고 좋아요·답글',video_playback50:'영상 절반 이상 시청',reply_engaged_by_author:'답글에 원 작성자가 반응',good_click:'대화 열고 좋아요·답글',good_click_v2:'대화 열고 2분 이상 체류',negative_feedback_v2:'부정적 피드백 통합',report:'신고'};
export const NEG=['negative_feedback_v2','report'];export const CONT=[];
export const DEFAULT_OPTIONS={diversity:true,decay:.5,floor:.25,oon:1,replyBoost:0,dwellBoost:0,multiplierPreOffset:false,excludeSeen:false};
export function validateWeights(w){if(!w||typeof w!=='object'||Array.isArray(w)||Object.keys(w).length!==10||Object.keys(w).some(k=>!Object.hasOwn(HEADS,k)))throw Error('2023년의 10개 항목 이름을 모두 유지해 주세요.');for(const[k,v]of Object.entries(w))if(typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>10000||(NEG.includes(k)?v>0:v<0))throw Error(`${k}: 유효한 ${NEG.includes(k)?'0 이하':'0 이상'} 숫자를 입력해 주세요 (절댓값 10000 이하).`);return {...w};}
export function terms(c,w){return Object.keys(HEADS).map(key=>({key,input:c.predictions[key]??0,weight:w[key]??0,value:(c.predictions[key]??0)*(w[key]??0)}));}
export function offsetScore(raw,w){const total=Object.values(w).reduce((s,v)=>s+Math.abs(v),0),negative=Object.values(w).filter(v=>v<0).reduce((s,v)=>s-v,0);return total===0?Math.max(raw,0):raw<0?(raw+negative)/total*.001:raw+.001;}
export function simulate(post,persona='balanced'){
 const c=commonSimulate(post,persona),p=c.predictions;
 const fixed=key=>seedOf(`${post.id}:${persona}:2023:${key}`)/4294967296;
 // Only favorite/reply/retweet/report are shared numerical inputs. Different event
 // definitions get separate fixed experimental inputs, not relabeled X predictions.
 c.predictions={favorite:p.favorite,reply:p.reply,retweet:p.retweet,report:p.report,good_profile_click:fixed('profile')*.025,video_playback50:0,reply_engaged_by_author:p.reply*fixed('author')*.3,good_click:fixed('click')*.04,good_click_v2:fixed('two_minutes')*.035,negative_feedback_v2:fixed('negative')*.006};
 c.signalsSource='실험용 고정 입력 (Heavy Ranker 예측 아님)';return c;
}
export function rank(candidates,w,o=DEFAULT_OPTIONS,filters={}){
 const rows=[];let excluded=0;for(const c of candidates){if(o.excludeSeen&&filters.seen?.has(c.id)||filters.following&&!c.inNetwork||filters.query&&!c.text.toLowerCase().includes(filters.query.toLowerCase())){excluded++;continue;}const components=terms(c,w),raw=components.reduce((s,t)=>s+t.value,0);rows.push({id:c.id,c,raw,base:offsetScore(raw,w),components});}
 rows.sort((a,b)=>b.base-a.base||a.id.localeCompare(b.id));const counts=new Map();for(const r of rows){const k=counts.get(r.c.authorGroup)||0;counts.set(r.c.authorGroup,k+1);r.authorPosition=k;r.diversity=o.diversity?diversityMultiplier(o.decay,o.floor,k):1;r.oon=1;r.score=r.base*r.diversity;}
 rows.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));rows.forEach((r,i)=>r.rank=i+1);return {rows,excluded};
}
