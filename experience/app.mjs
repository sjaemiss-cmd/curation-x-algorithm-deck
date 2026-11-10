import {joinTranslations} from './translations.mjs?v=ko1';
import {HEADS,NEG,CONT,DEFAULT_OPTIONS,validateWeights,rank,simulate,ERA,DEFAULTS_PATH} from './active-engine.mjs?v=ko1';
const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.abs(n)>=100?n.toFixed(1):Math.abs(n)>=1?n.toFixed(3):n.toFixed(5);
const displayText=s=>s.replace(/\\u([0-9a-fA-F]{4})/g,(_,hex)=>String.fromCharCode(parseInt(hex,16)));
const postText=c=>c.text_ko||displayText(c.text);
const common=['favorite','reply','retweet','share','share_via_copy_link','dwell_time','report','reply_engaged_by_author','good_click_v2','negative_feedback_v2'];
const ranges={favorite:[0,10,.01],reply:[0,30,.1],retweet:[0,20,.1],share:[0,30,.1],share_via_copy_link:[0,50,.1],dwell_time:[0,1,.001],report:[-500,0,1]};
const svg={reply:'<path d="M20 11.5a8 8 0 0 1-8 8H5l-3 2v-10a9 9 0 1 1 18 0Z"/>',retweet:'<path d="m4 8 3-3 3 3M7 5v11h7m6 0-3 3-3-3m3 3V8h-7"/>',like:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',save:'<path d="M6 3h12v18l-6-4-6 4Z"/>',read:'<path d="m4 12 5 5L20 6"/>'};
let raw=[],candidates=[],defaults,weights,options={...DEFAULT_OPTIONS},baselineWeights,baselineOptions,baselineMap=new Map(),baselineTop=[],rows=[],visible=20,selected=null,following=false,savedMode=false,persona='balanced',query='',seen=new Set(),saved=new Set(),liked=new Set(),reposted=new Set(),dataMeta,frame=0,baselineDirty=true;
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),2600);}
function openGuide(){$('guide').showModal();}
function openControls(){$('controls-pane').classList.add('open');$('controls-close').focus();}
function openInspector(){$('inspector-pane').classList.add('open');if(innerWidth<=900)$('inspector-close').focus();}
function syncCode(){$('weights-code').value=JSON.stringify(weights,null,2);}
function buildControls(){
 for(const container of ['weight-controls','extra-controls'])$(container).replaceChildren();
 for(const [key,label]of Object.entries(HEADS)){
  const negative=NEG.includes(key);const[min,max,step]=ranges[key]||[negative?-100:0,negative?0:30,.01];
  const wrapper=document.createElement('div');wrapper.className='weight'+(negative?' negative':'');
  wrapper.innerHTML=`<div class="weight-head"><label for="weight-${key}">${label}</label><input id="number-${key}" aria-label="${label} 가중치 숫자" type="number" min="${negative?-10000:0}" max="${negative?0:10000}" step="any" value="${weights[key]}"></div><small>${key}${CONT.includes(key)?' · 시간 입력':''}</small><input id="weight-${key}" aria-label="${label} 가중치" type="range" min="${Math.min(min,weights[key])}" max="${Math.max(max,weights[key])}" step="${step}" value="${weights[key]}">`;
  $(common.includes(key)?'weight-controls':'extra-controls').append(wrapper);
  wrapper.querySelector('[type=range]').addEventListener('input',e=>{weights[key]=+e.target.value;$('number-'+key).value=weights[key];weightChanged();});
  wrapper.querySelector('[type=number]').addEventListener('change',e=>{
   try{const value=e.target.value;if(value==='')throw Error('숫자를 입력해 주세요.');weights=validateWeights({...weights,[key]:Number(value)});const r=$('weight-'+key);r.min=Math.min(min,weights[key]);r.max=Math.max(max,weights[key]);r.value=weights[key];weightChanged();}catch(err){e.target.value=weights[key];toast(err.message);}
  });
 }
}
function weightChanged(){document.querySelectorAll('[data-preset]').forEach(b=>b.classList.remove('active'));syncCode();schedule();}
function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(recompute);}
function pool(){return savedMode?candidates.filter(c=>saved.has(c.id)):candidates;}
function recompute(){
 const start=performance.now();const filters={following,query,seen};const source=pool();
 if(baselineDirty){const b=rank(source,baselineWeights,baselineOptions,filters);baselineMap=new Map(b.rows.map(r=>[r.id,r.rank]));baselineTop=b.rows.slice(0,20).map(r=>r.id);baselineDirty=false;}
 const result=rank(source,weights,options,filters);rows=result.rows;const duration=performance.now()-start;
 $('latency').textContent=duration.toFixed(0)+' ms';const top=rows.slice(0,20);const retained=top.filter(r=>baselineTop.includes(r.id)).length;
 $('changed').textContent=(Math.max(top.length,baselineTop.length)-retained)+' / '+Math.max(top.length,baselineTop.length);
 $('load-state').textContent=`실제 원문 ${raw.length.toLocaleString()}개 · 후보 ${rows.length.toLocaleString()}개`;
 $('reorder-status').textContent=`${savedMode?'저장한 글 · ':''}${rows.length.toLocaleString()}개 재정렬 · 제외 ${result.excluded.toLocaleString()}개`;
 const net=top.filter(r=>r.c.inNetwork).length,groups=new Set(top.map(r=>r.c.authorGroup)).size;
 $('composition').innerHTML=`<div class="composition"><span style="width:${top.length?net/top.length*100:0}%;background:#1d9bf0"></span></div><div class="composition-labels"><span>팔로우 ${net} / ${top.length}</span><span>작성자 그룹 ${groups}개</span></div><p class="micro">상위 20개 기준 · 관계와 그룹은 실험값</p>`;
 const movers=rows.filter(r=>baselineMap.has(r.id)&&baselineMap.get(r.id)>r.rank).sort((a,b)=>(baselineMap.get(b.id)-b.rank)-(baselineMap.get(a.id)-a.rank)).slice(0,4);
 $('movers').innerHTML=movers.length?movers.map(r=>`<button class="mover" data-detail="${esc(r.id)}"><b>↑ ${baselineMap.get(r.id)-r.rank}</b>${esc(postText(r.c).slice(0,65))}</button>`).join(''):'<p class="micro">가중치를 바꾸면 올라온 글이 나타나요.</p>';
 renderFeed();if(selected)renderDetail(selected);
 window.labSnapshot={year:ERA,count:raw.length,eligible:rows.length,top:top.map(r=>r.id),weights:{...weights},ms:duration,ranks:Object.fromEntries(rows.map(r=>[r.id,r.rank])),ids:raw.map(p=>p.id),persona,query};
 if(window.parent!==window)window.parent.postMessage({type:'lab-snapshot',...window.labSnapshot},'*');
}
function movement(r){const before=baselineMap.get(r.id);if(!before)return '<span class="rank-up">새 진입</span>';const d=before-r.rank;return `<span class="${d>0?'rank-up':d<0?'rank-down':'rank-same'}">${d>0?'↑ '+d:d<0?'↓ '+(-d):'변동 없음'}</span>`;}
function sourceUrl(c){return dataMeta.sourceUrl+'#L'+c.sourceLine;}
function renderFeed(){
 $('feed').innerHTML=rows.length?rows.slice(0,visible).map(r=>{
  const c=r.c;return `<article class="post ${selected===r.id?'selected':''}" data-id="${esc(r.id)}"><div class="avatar" aria-label="실험용 작성자 그룹">${c.authorGroup}</div><div class="post-content"><div class="rank-strip"><b>${r.rank}위</b>${movement(r)}<span class="post-handle">${c.inNetwork?'팔로우':'팔로우 밖'}</span></div><div class="post-header"><strong>익명 게시글</strong><span class="post-handle">그룹 ${c.authorGroup} · 실험</span></div><p class="post-text" lang="ko">${esc(postText(c))}</p><details class="original-text"><summary>영어 원문 보기 · AI 번역</summary><p lang="en">${esc(displayText(c.text))}</p></details><div class="post-actions"><button data-action="reply" data-id="${r.id}" aria-label="답글 예상값 보기"><svg viewBox="0 0 24 24">${svg.reply}</svg><span>예상</span></button><button data-action="retweet" data-id="${r.id}" class="${reposted.has(r.id)?'on':''}" aria-pressed="${reposted.has(r.id)}" aria-label="재게시 표시"><svg viewBox="0 0 24 24">${svg.retweet}</svg></button><button data-action="like" data-id="${r.id}" class="${liked.has(r.id)?'on':''}" aria-pressed="${liked.has(r.id)}" aria-label="좋아요 표시"><svg viewBox="0 0 24 24">${svg.like}</svg></button><button data-action="save" data-id="${r.id}" class="${saved.has(r.id)?'on':''}" aria-pressed="${saved.has(r.id)}" aria-label="글 저장"><svg viewBox="0 0 24 24">${svg.save}</svg></button><button data-action="read" data-id="${r.id}" class="${seen.has(r.id)?'on':''}" aria-pressed="${seen.has(r.id)}" aria-label="읽음 표시"><svg viewBox="0 0 24 24">${svg.read}</svg><span>읽음</span></button></div><button class="explain" data-detail="${r.id}">왜 이 순위일까? · ${fmt(r.score)}</button><a class="source-mini" href="${sourceUrl(c)}" target="_blank" rel="noopener" aria-label="연구 데이터 원문 ${c.sourceLine}행">원문 ↗</a></div></article>`;
 }).join(''):'<div class="empty">이 조건에 맞는 글이 없어요.<br>검색어나 필터를 바꾸거나 전체 피드로 돌아가 주세요.</div>';
 $('load-more').hidden=visible>=rows.length;
}
function renderDetail(id){
 const r=rows.find(r=>r.id===id);if(!r){$('detail').innerHTML='<h3>현재 후보에서 제외된 글입니다.</h3><p>필터를 해제하거나 다른 글을 선택해 보세요.</p>';return;}
 const all=r.components.slice().sort((a,b)=>Math.abs(b.value)-Math.abs(a.value)),max=Math.max(...all.map(t=>Math.abs(t.value)),.00001);
 $('detail').innerHTML=`<h3>${r.rank}위는 어떻게 정해졌을까?</h3><p lang="ko">${esc(postText(r.c).slice(0,140))}</p><p>${r.c.signalsSource}</p><div class="score-equation">① 예상값 × 가중치 합 <strong>${fmt(r.raw)}</strong><br>② 음수 처리 후 <strong>${fmt(r.base)}</strong><br>③ 작성자 배율 <strong>× ${fmt(r.diversity)}</strong><br>④ 팔로우 밖 배율 <strong>× ${fmt(r.oon)}</strong><br>최종 점수 <strong>${fmt(r.score)}</strong></div><p class="micro">${options.multiplierPreOffset?'배율을 먼저 적용한 뒤 음수 처리합니다. 음수 원점수에는 배율을 곱하지 않습니다. 위 ②는 비교용 중간값입니다.':'음수 처리 후 작성자·팔로우 밖 배율을 곱합니다.'} 동일 점수는 글 ID 순서로 고정합니다.</p><p class="micro">같은 그룹에서 점수 순서상 ${r.authorPosition+1}번째. 실제 작성자 정보가 아니라 실험용 그룹입니다.</p><h3>점수에 더해진 값</h3>${all.map(t=>`<div class="contribution"><div class="contribution-head"><span>${HEADS[t.key]}</span><b>${t.value>=0?'+':''}${fmt(t.value)}</b></div><div class="contribution-track"><div class="contribution-bar ${t.value<0?'neg':''}" style="width:${Math.abs(t.value)/max*100}%"></div></div><small>${fmt(t.input)} × ${fmt(t.weight)}${!CONT.includes(t.key)?' (예상 확률 × 가중치)':' (시간 관련 입력 × 가중치)'}</small></div>`).join('')}<p class="micro">영상 정보가 없는 데이터이므로 영상 항목은 0입니다. 조건을 만족하지 않는 항목도 적용 가중치가 0입니다. 실제 좋아요·조회수는 수집되지 않았으며 계산에 사용하지 않습니다.</p>`;
}
function chooseDetail(id){if(window.parent!==window){const row=rows.find(r=>r.id===id);if(row)window.parent.postMessage({type:'lab-selected',id,text:postText(row.c)},'*');}selected=id;renderDetail(id);document.querySelectorAll('.post').forEach(e=>e.classList.toggle('selected',e.dataset.id===id));openInspector();}
document.addEventListener('click',e=>{
 const detail=e.target.closest('[data-detail]');if(detail)chooseDetail(detail.dataset.detail);
 const action=e.target.closest('[data-action]');if(!action)return;const id=action.dataset.id,kind=action.dataset.action;
 if(kind==='reply'){chooseDetail(id);return;}
 const set={like:liked,retweet:reposted,save:saved,read:seen}[kind];set.has(id)?set.delete(id):set.add(id);
 if(kind==='read'&&options.excludeSeen||kind==='save'&&savedMode){baselineDirty=true;recompute();}else renderFeed();
 toast(kind==='read'?'읽음 표시를 바꿨어요. 제외 필터를 켜면 숨길 수 있어요.':kind==='save'?'저장 목록을 바꿨어요.':'이 체험 안에서만 표시됩니다. 고정된 예측값은 바뀌지 않아요.');
});
for(const id of ['guide-open','data-open','nav-info'])$(id).onclick=openGuide;
$('guide-close').onclick=()=>$('guide').close();$('guide').addEventListener('click',e=>{if(e.target===$('guide'))$('guide').close();});
for(const id of ['controls-toggle','profile-toggle'])$(id).onclick=openControls;
$('controls-close').onclick=()=>{$('controls-pane').classList.remove('open');$('controls-toggle').focus();};
$('mobile-inspect').onclick=openInspector;$('inspector-close').onclick=()=>{$('inspector-pane').classList.remove('open');$('mobile-inspect').focus();};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('controls-pane').classList.remove('open');$('inspector-pane').classList.remove('open');}});
function switchFeed(value){following=value;savedMode=false;visible=20;baselineDirty=true;$('tab-for-you').classList.toggle('selected',!value);$('tab-following').classList.toggle('selected',value);$('tab-for-you').setAttribute('aria-selected',!value);$('tab-following').setAttribute('aria-selected',value);recompute();}
$('tab-for-you').onclick=()=>switchFeed(false);$('tab-following').onclick=()=>switchFeed(true);
$('nav-home').onclick=()=>{query='';$('search').value='';$('nav-saved').classList.remove('selected');$('nav-home').classList.add('selected');switchFeed(false);};
$('nav-search').onclick=()=>{$('search-wrap').hidden=!$('search-wrap').hidden;if(!$('search-wrap').hidden)$('search').focus();};
$('nav-saved').onclick=()=>{savedMode=!savedMode;visible=20;baselineDirty=true;$('nav-saved').classList.toggle('selected',savedMode);$('nav-home').classList.toggle('selected',!savedMode);recompute();};
$('search').addEventListener('input',e=>{query=e.target.value;visible=20;baselineDirty=true;schedule();});
$('load-more').onclick=()=>{visible+=20;renderFeed();};
$('persona').onchange=e=>{persona=e.target.value;candidates=raw.map(p=>simulate(p,persona));baselineDirty=true;visible=20;selected=null;recompute();$('detail').innerHTML='<h3>이용자 조건을 바꿨어요.</h3><p>현재 이용자의 같은 예측값으로 기준 설정과 수정 설정을 비교합니다.</p>';};
for(const key of ['diversity','excludeSeen','multiplierPreOffset'])$(key).onchange=e=>{options[key]=e.target.checked;schedule();};
for(const key of ['decay','floor','replyBoost','oon'])$(key).addEventListener($(key).type==='range'?'input':'change',e=>{const v=Number(e.target.value);if(e.target.value===''||!Number.isFinite(v)||v<+e.target.min||v>+e.target.max){e.target.value=options[key];toast('표시된 범위 안의 숫자를 입력해 주세요.');return;}options[key]=v;if($(key+'-value'))$(key+'-value').textContent=v;schedule();});
$('apply-code').onclick=()=>{try{weights=validateWeights(JSON.parse($('weights-code').value));$('code-error').textContent='';buildControls();weightChanged();toast('코드를 실제 점수 계산에 적용했어요.');}catch(e){$('code-error').textContent=e.message;}};
$('export-weights').onclick=()=>{const blob=new Blob([JSON.stringify({weights,options,persona,sourceCommit:ERA==='2023'?'ef4c5eb + b852108':'b5089266c0fbad66f388051f8f89056e2a8f974d',inputKind:'deterministic experimental signals, not Phoenix'},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='x-lab-weights.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('pin-baseline').onclick=()=>{baselineWeights={...weights};baselineOptions={...options};baselineDirty=true;$('baseline-info').textContent='비교 기준: 내가 저장한 설정 (같은 이용자·검색 조건)';recompute();toast('현재 설정을 비교 기준으로 고정했어요.');};
function reset(){weights={...defaults};options={...DEFAULT_OPTIONS};baselineWeights={...weights};baselineOptions={...options};persona='balanced';$('persona').value=persona;candidates=raw.map(p=>simulate(p,persona));query='';$('search').value='';$('search-wrap').hidden=true;following=false;savedMode=false;seen.clear();saved.clear();liked.clear();reposted.clear();selected=null;visible=20;baselineDirty=true;for(const key of ['diversity','excludeSeen','multiplierPreOffset'])$(key).checked=options[key];for(const key of ['decay','floor','replyBoost','oon']){$(key).value=options[key];if($(key+'-value'))$(key+'-value').textContent=options[key];}buildControls();syncCode();$('code-error').textContent='';$('baseline-info').textContent='비교 기준: 시작할 때의 공개 기본값';document.querySelectorAll('[data-preset]').forEach(b=>b.classList.toggle('active',b.dataset.preset==='default'));$('nav-saved').classList.remove('selected');$('nav-home').classList.add('selected');$('detail').innerHTML='<h3>게시글의 점수를 열어 보세요.</h3><p>‘왜 이 순위일까?’에서 각 항목을 확인할 수 있어요.</p>';switchFeed(false);}
$('reset').onclick=()=>{reset();toast('모든 실험 설정과 표시를 처음 상태로 되돌렸어요.');};
document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{weights={...defaults};if(b.dataset.preset==='likes')weights.favorite=10;if(b.dataset.preset==='share'){weights.retweet=15;if(ERA==='2026'){weights.share=30;weights.share_via_copy_link=50;}}if(b.dataset.preset==='time'){if(ERA==='2023'){weights.good_click_v2=40;}else{weights.dwell_time=1;weights.click_dwell_time=2;}}buildControls();syncCode();document.querySelectorAll('[data-preset]').forEach(x=>x.classList.toggle('active',x===b));schedule();});
try{
 const load=async url=>{const r=await fetch(url);if(!r.ok)throw Error(`${url} (${r.status})`);return r.json();};
 [raw,defaults,dataMeta]=await Promise.all([load('data/posts.json'),load(DEFAULTS_PATH),load('data/provenance.json')]);validateWeights(defaults);raw=joinTranslations(raw,await load('data/posts.ko.json'));
 if(raw.length!==10000||new Set(raw.map(p=>p.text)).size!==10000)throw Error('실제 원문 1만 개의 무결성 검사 실패');
 if(ERA==='2023')setupTwitterUI();$('provenance').innerHTML=`<p>원 자료 ${dataMeta.sourceRows.toLocaleString()}행에서 중복을 제거하고, 고정 seed ${dataMeta.seed}로 10,000개를 선택했습니다.</p><p>데이터 버전 <code>${esc(dataMeta.commit)}</code><br>다운로드 파일 SHA-256 <code>${esc(dataMeta.sourceSha256)}</code></p>`;
 reset();
}catch(e){$('load-state').textContent='자료를 불러오지 못했어요.';$('feed').innerHTML=`<div class="empty">${esc(e.message)}<br>앱 폴더에서 npm start를 실행한 뒤 http://127.0.0.1:8877로 접속해 주세요.</div>`;$('load-more').hidden=true;document.querySelectorAll('.controls-pane button,.controls-pane input,.controls-pane select').forEach(x=>x.disabled=true);}

function setupTwitterUI(){
 document.body.classList.add('twitter-era');
 document.title='트위터 2023 · 큐레이션 실험';
 document.querySelector('.identity strong').textContent='트위터 2023';
 document.querySelectorAll('.xmark').forEach(el=>{el.innerHTML='<svg viewBox="0 0 24 24" aria-label="Twitter" style="width:30px;height:30px;fill:#1da1f2"><path d="M23 4.7a9.3 9.3 0 0 1-2.7.8 4.7 4.7 0 0 0 2.1-2.6 9.3 9.3 0 0 1-3 1.1 4.6 4.6 0 0 0-7.9 4.2A13.1 13.1 0 0 1 2 3.4a4.6 4.6 0 0 0 1.4 6.2 4.6 4.6 0 0 1-2.1-.6 4.6 4.6 0 0 0 3.7 4.6 4.6 4.6 0 0 1-2.1.1 4.6 4.6 0 0 0 4.3 3.2A9.3 9.3 0 0 1 1.4 19 13.1 13.1 0 0 0 21.6 8c0-.2 0-.4-.1-.6A9.4 9.4 0 0 0 23 4.7Z"/></svg>';});
 document.querySelector('[data-preset="share"]').textContent='리트윗 중심';
 document.querySelector('[data-preset="time"]').textContent='2분 체류 중심';
 const source=document.querySelector('.source-link');source.href='https://github.com/twitter/the-algorithm/blob/ef4c5eb/home-mixer/server/src/main/scala/com/twitter/home_mixer/product/scored_tweets/scorer/WeightedScoresSumScorer.scala';source.textContent='계산의 근거: 2023 Scala 코드 ↗';
 for(const id of ['replyBoost','oon','multiplierPreOffset'])$(id).closest('label').hidden=true;
 document.querySelector('#code-panel p').textContent='2023년의 10개 항목을 수정합니다. 숫자가 실제 계산에 쓰입니다.';
 document.querySelector('.bottom-actions + .micro').textContent='기본 가중치: 2023-04-05 Heavy Ranker 공개 문서. 초기 Scala의 임시값과 구분합니다.';
 const body=document.querySelector('.dialog-body');body.innerHTML=`<p>2023년 Twitter의 공개 가중 합산·음수 점수 처리·작성자 다양성 코드를 실행하는 교육용 모형입니다.</p><h3>가중치의 출처</h3><p>2023-04-05 모델 README(b852108)에 명시된 10개 값을 사용합니다. 2023-03-31 Scala(ef4c5eb)의 임시 기본값 1.0을 운영 가중치로 간주하지 않습니다.</p><h3>동일한 입력, 다른 의미</h3><p>양쪽에 같은 1만 개 원문과 작성자 그룹을 사용합니다. 좋아요·답글·재게시·신고는 같은 실험 확률입니다. 나머지는 의미가 달라 별도의 고정 실험값을 씁니다. good_click_v2는 ‘대화를 열고 2분 이상 체류할 확률’이며, 2026년 체류 시간(초)과 같지 않습니다. 부정적 피드백 통합 항목도 2026년 개별 확률의 합으로 만들지 않았습니다.</p><p>작성자 그룹·팔로우·예측값은 실험용입니다. 실제 Heavy Ranker 학습 모델, 후보 검색, 평판·인증·광고 등 전체 운영 과정을 실행하지 않습니다. 화면도 당시 앱과 픽셀 단위 동일성을 검증한 것이 아닙니다.</p><h3>점수 계산</h3><p>예상 확률 × 가중치 10개를 합칩니다. 합이 음수이면 음수 가중치 절댓값 합과 전체 절댓값 합으로 0.001 범위에 변환합니다. 같은 작성자 그룹의 순번에 따라 (1-floor) × decay^k + floor를 곱합니다. 2026년 맞팔 가중치·팔로우 밖 배율 규칙을 이식하지 않았습니다.</p><div id="provenance"></div><p><a href="evidence/twitter-2023/Heavy-Ranker-README.md">당시 10개 가중치 문서</a> · <a href="evidence/twitter-2023/WeightedScoresSumScorer.scala">합산·음수 처리 코드</a> · <a href="evidence/twitter-2023/DiversityDiscountProvider.scala">다양성 코드</a> · <a href="README.md">데이터·구현·한계와 소스 안내</a></p><p>본문은 TweetEval 과거 실제 원문의 AI 한국어 번역이며 영어 원문을 펼쳐볼 수 있습니다. 추천 계산은 영어 원문을 사용하며 작성자·날짜·사진·반응 수는 없습니다. 이 결과는 실제 2023년 피드의 복원이나 두 모델의 우열 증명이 아닙니다.</p>`;
}
if(window.parent!==window){
 document.body.classList.add('embedded');
 window.addEventListener('message',event=>{
  if(event.source!==window.parent||event.data?.type!=='lab-command'||!defaults)return;
  const d=event.data;
  if(d.action==='shared'){persona=d.persona||'balanced';query=d.query||'';following=!!d.following;savedMode=false;seen.clear();options.excludeSeen=false;$('excludeSeen').checked=false;$('persona').value=persona;$('search').value=query;candidates=raw.map(p=>simulate(p,persona));visible=20;baselineDirty=true;recompute();}
  if(d.action==='reset')reset();
 });
}
