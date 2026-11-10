// Educational JavaScript port of xai-value-model/scoring.rs at b508926.
// Source is preserved in evidence/scoring.rs. Phoenix inference is NOT included.
export const HEADS={favorite:'좋아요',reply:'답글',retweet:'재게시',photo_expand:'사진 확대',video_open:'영상 열기',click:'게시물 클릭',open_link:'링크 열기',profile_click:'프로필 클릭',vqv:'유효 영상 시청',share:'공유',share_via_dm:'DM 공유',share_via_copy_link:'링크 복사 공유',dwell:'머무르기',quote:'인용',quoted_click:'인용 글 클릭',quoted_vqv:'인용 영상 시청',dwell_time:'체류 시간',click_dwell_time:'클릭 후 체류 시간',video_continuation:'영상 지속 시청',user_video_continuation:'이용자 영상 지속 시청',profile_visit_secs:'프로필 방문 시간',follow_author:'작성자 팔로우',not_interested:'관심 없음',block_author:'차단',mute_author:'뮤트',report:'신고',not_dwelled:'바로 넘기기',post_unexplored:'미탐색 글',post_video:'영상 글',grok_analyze:'Grok 분석'};
export const NEG=['not_interested','block_author','mute_author','report','not_dwelled'];
export const CONT=['dwell_time','click_dwell_time','video_continuation','user_video_continuation','profile_visit_secs'];
export const DEFAULT_OPTIONS={diversity:true,decay:.5,floor:.25,oon:1,replyBoost:15,dwellBoost:0,postUnexploredOon:false,oonRescore:false,multiplierPreOffset:false,excludeSeen:false};
export function validateWeights(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('가중치는 JSON 객체로 입력해 주세요.');
 const keys=Object.keys(value);if(keys.length!==30||keys.some(k=>!Object.hasOwn(HEADS,k)))throw Error('30개 항목을 모두 유지해 주세요. 알 수 없는 항목은 사용할 수 없어요.');
 for(const [k,v]of Object.entries(value)){if(typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>10000)throw Error(`${k}: -10000~10000 사이의 숫자를 입력해 주세요.`);if(NEG.includes(k)?v>0:v<0)throw Error(`${k}: ${NEG.includes(k)?'0 이하':'0 이상'}로 입력해 주세요.`);}
 return {...value};
}
export function terms(c,w,o=DEFAULT_OPTIONS){
 const p=c.predictions; const mutual=c.mutual&&!c.isReply&&!c.isRetweet;
 return Object.keys(HEADS).map(key=>{
  let weight=w[key]||0;
  if(key==='reply'&&mutual)weight+=o.replyBoost;
  if(key==='dwell'&&mutual)weight+=o.dwellBoost;
  if(key==='vqv'&&!c.vqvEligible||key==='quoted_vqv'&&!c.quotedVqvEligible||key==='post_unexplored'&&!o.postUnexploredOon&&c.inNetwork!==true)weight=0;
  let input=p[key]??0;
  if(key==='video_continuation')input=(p.video_open??0)*(p.home_video_continuation_secs??0);
  if(key==='user_video_continuation')input=(p.video_open??0)*(c.userVideoContinuationSecs??0);
  if(key==='profile_visit_secs')input=(p.profile_click??0)*(p.home_profile_visit_secs??0);
  return {key,input,weight,value:input*weight};
 });
}
export function offsetScore(score,w){
 const negative=-NEG.reduce((sum,k)=>sum+(w[k]||0),0);
 const positive=Object.keys(HEADS).filter(k=>!NEG.includes(k)&&!CONT.includes(k)).reduce((sum,k)=>sum+(w[k]||0),0);
 const total=negative+positive;
 return total===0?Math.max(score,0):score<0?(score+negative)/total*.001:score+.001;
}
export const diversityMultiplier=(decay,floor,exponent)=>(1-floor)*decay**exponent+floor;
export function rank(candidates,w,o=DEFAULT_OPTIONS,filters={}){
 const rows=[];let excluded=0;
 for(const c of candidates){
  if((o.excludeSeen&&filters.seen?.has(c.id))||(filters.following&&!c.inNetwork)||(filters.query&&!c.text.toLowerCase().includes(filters.query.toLowerCase())&&!(c.text_ko||'').toLowerCase().includes(filters.query.toLowerCase()))){excluded++;continue;}
  const components=terms(c,w,o);const raw=components.reduce((s,t)=>s+t.value,0);
  rows.push({id:c.id,c,raw,base:offsetScore(raw,w),score:0,components});
 }
 rows.sort((a,b)=>b.base-a.base||a.id.localeCompare(b.id));const counts=new Map();
 for(const r of rows){const k=counts.get(r.c.authorGroup)||0;counts.set(r.c.authorGroup,k+1);r.authorPosition=k;
  r.diversity=o.diversity?diversityMultiplier(o.decay,o.floor,k):1;
  r.oon=r.c.inNetwork===false||(r.c.inNetwork===true&&o.oonRescore&&(r.c.isReply||r.c.isRetweet))?o.oon:1;
  const mult=r.diversity*r.oon;
  r.score=o.multiplierPreOffset?offsetScore(r.raw>=0?r.raw*mult:r.raw,w):r.base*mult;
 }
 rows.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));rows.forEach((r,i)=>r.rank=i+1);return {rows,excluded};
}
export function seedOf(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
export function simulate(post,persona='balanced'){
 const rnd=rng(seedOf(post.id+':'+persona+':411'));const text=post.text;const group=seedOf(post.id)%1200;
 const long=Math.min(text.length/280,1);const sports=/football|soccer|basketball|match|team|game|baseball/i.test(text);const music=/music|concert|album|song|band|singer/i.test(text);
 const affinity=persona==='sports'&&sports||persona==='music'&&music?1.65:1;
 const p={};for(const k of Object.keys(HEADS)){p[k]=rnd()*(NEG.includes(k)?.004:.12);}
 p.favorite=Math.min(.95,(.04+rnd()*.45)*affinity);p.reply=(text.includes('?')?.13:.02)*rnd();p.retweet=rnd()*.12*affinity;p.share=rnd()*.1*affinity;p.share_via_dm=rnd()*.025;p.share_via_copy_link=rnd()*.02;
 p.dwell=Math.min(.99,.1+long*.5+rnd()*.2);p.dwell_time=2+long*25+rnd()*8;p.click_dwell_time=rnd()*long*5;p.report=rnd()*.001;p.follow_author=rnd()*.035;
 for(const k of ['photo_expand','video_open','vqv','quoted_vqv','post_video','video_continuation','user_video_continuation','profile_visit_secs'])p[k]=0;
 p.home_profile_visit_secs=rnd()*8;
 return {...post,authorGroup:String(group),inNetwork:group%3===0,mutual:group%13===0,isReply:text.startsWith('@user'),isRetweet:text.startsWith('RT '),vqvEligible:false,quotedVqvEligible:false,predictions:p,signalsSource:'실험용 고정 입력 (Phoenix 예측 아님)',topic:sports?'스포츠':music?'음악':'그 외'};
}
