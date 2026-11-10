from pathlib import Path
import urllib.request, json, hashlib, random, re
ROOT=Path(__file__).resolve().parents[1]
COMMIT='4fbd22cd78421f05b1ecdb4fc5725bc7a7bd8f66'
url=f'https://raw.githubusercontent.com/cardiffnlp/tweeteval/{COMMIT}/datasets/sentiment/train_text.txt'
data=urllib.request.urlopen(url,timeout=60).read()
lines=data.decode('utf-8').splitlines()
unique={}
for i,line in enumerate(lines,1):
    if line.strip() and line not in unique: unique[line]=i
sample=random.Random(411).sample(list(unique.items()),10000)
posts=[{'id':f'te-{i}','text':text,'sourceLine':i} for text,i in sample]
(ROOT/'data').mkdir(exist_ok=True)
(ROOT/'data/posts.json').write_text(json.dumps(posts,ensure_ascii=False,separators=(',',':')),encoding='utf8')
meta={'dataset':'TweetEval / sentiment / train','commit':COMMIT,'url':url,'sourceUrl':f'https://github.com/cardiffnlp/tweeteval/blob/{COMMIT}/datasets/sentiment/train_text.txt','sourceSha256':hashlib.sha256(data).hexdigest(),'sourceRows':len(lines),'uniqueSourceRows':len(unique),'selected':len(posts),'seed':411,'selection':'random.sample over first occurrence of each unique exact text','content':'Historical actual tweet texts, dataset preprocessing retained','unavailable':['original author identity','original timestamp','post ID and live URL','photos and videos','engagement counts','Phoenix predictions'],'reference':'https://github.com/cardiffnlp/tweeteval','paper':'https://aclanthology.org/2020.findings-emnlp.148/','originalDatasetPaper':'https://aclanthology.org/S17-2088/','licenseNote':'TweetEval refers users to original task licenses and Twitter regulations. Local educational prototype; no public redistribution performed.'}
(ROOT/'data/provenance.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf8')
repo=ROOT.parent/'repos/xai-org_x-algorithm'
param=(repo/'home-mixer/params/param.rs').read_text(encoding='utf8')
values={k:float(v) for k,v in re.findall(r'param!\(\s*(\w+),\s*f64,\s*"[^"]+",\s*(-?[\d.]+)\s*\)',param)}
mapping={'favorite':'Favorite','reply':'Reply','retweet':'Retweet','photo_expand':'PhotoExpand','video_open':'VideoOpen','click':'Click','open_link':'OpenLink','profile_click':'ProfileClick','vqv':'Vqv','share':'Share','share_via_dm':'ShareViaDm','share_via_copy_link':'ShareViaCopyLink','dwell':'Dwell','quote':'Quote','quoted_click':'QuotedClick','quoted_vqv':'QuotedVqv','follow_author':'FollowAuthor','post_unexplored':'PostUnexplored','post_video':'PostVideo','grok_analyze':'GrokAnalyze','not_interested':'NotInterested','block_author':'BlockAuthor','mute_author':'MuteAuthor','report':'Report','not_dwelled':'NotDwelled','dwell_time':'ContDwellTime','click_dwell_time':'ContClickDwellTime'}
defaults={k:values[v+'Weight'] for k,v in mapping.items()}
# These three heads are available in scoring.rs; no default claimed from param.rs.
defaults.update(video_continuation=0,user_video_continuation=0,profile_visit_secs=0)
(ROOT/'data/source-defaults.json').write_text(json.dumps(defaults,indent=2),encoding='utf8')
for name in ['scoring.rs','weights.rs','inputs.rs']:
 (ROOT/'evidence'/name).write_bytes((repo/'xai-value-model'/name).read_bytes())
(ROOT/'evidence/LICENSE-X').write_bytes((repo/'LICENSE').read_bytes())
print(json.dumps({'posts':len(posts),'unique':len(set(p['text'] for p in posts)),'sourceSha256':meta['sourceSha256'],'defaults':len(defaults)}))
