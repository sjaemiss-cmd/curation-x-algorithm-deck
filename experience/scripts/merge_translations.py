from pathlib import Path
import json,hashlib,datetime,re,argparse
root=Path(__file__).resolve().parents[1]
workspace=root.parents[2]
parser=argparse.ArgumentParser();parser.add_argument('--check-only',action='store_true');args=parser.parse_args()
original=json.loads((root/'data/posts.json').read_text(encoding='utf8'))
shards=workspace/'.agent-work/411-curation-x-algorithm/translations'
translations={};duplicates=[];invalid_batches=[]
def add(row):
 if row['id'] in translations:duplicates.append(row['id'])
 translations[row['id']]=row['text_ko']
for filename in ['a.jsonl','b.jsonl','c.jsonl']:
 p=shards/filename
 if not p.exists():continue
 for line in p.read_text(encoding='utf-8-sig').splitlines():
  if not line.strip():continue
  row=json.loads(line)
  add(row)
for p in sorted((shards/'chunks').glob('*.json')):
 rows=json.loads(p.read_text(encoding='utf8'))
 match=re.fullmatch(r'[abc]_(\d+)_(\d+)',p.stem)
 if not match or [row['id'] for row in rows]!=[row['id'] for row in original[int(match[1]):int(match[2])+1]]:invalid_batches.append(p.name)
 for row in rows:add(row)
ids={p['id'] for p in original};missing=ids-translations.keys();extra=translations.keys()-ids
empty=[k for k,v in translations.items() if not isinstance(v,str) or not v.strip()]
placeholder=[k for k,v in translations.items() if re.search(r'^(번역 예정|번역 실패|TODO|미번역)$',v.strip())]
unchanged=[p['id'] for p in original if translations.get(p['id'])==p['text']]
no_korean=[k for k,v in translations.items() if not re.search('[가-힣]',v)]
encoding_damage=[k for k,v in translations.items() if '\ufffd' in v or (not re.search('[가-힣]',v) and v.count('?')>max(3,len(v)/3))]
mention_mismatch=[p['id'] for p in original if p['id'] in translations and p['text'].count('@user')!=translations[p['id']].count('@user')]
hashtag_mismatch=[p['id'] for p in original if p['id'] in translations and any(tag not in translations[p['id']] for tag in re.findall(r'(?<!&)#[A-Za-z_][A-Za-z_0-9]*',p['text']))]
report={'total':len(original),'translated':len(translations),'missing':len(missing),'extra':list(extra),'duplicates':duplicates,'empty':empty,'placeholders':placeholder,'unchanged':unchanged,'no_korean':no_korean,'encoding_damage':encoding_damage,'mention_mismatch':mention_mismatch,'hashtag_mismatch':hashtag_mismatch}
print(json.dumps(report,ensure_ascii=False))
if invalid_batches:print(json.dumps({'invalid_batches':invalid_batches}))
if args.check_only:raise SystemExit(0)
if missing or extra or duplicates or empty or placeholder or encoding_damage or no_korean or unchanged or mention_mismatch or hashtag_mismatch or invalid_batches:
 raise SystemExit('번역 누락·손상 또는 원문 멘션 불일치가 있습니다. 위 검사 결과를 수정한 후 다시 병합하세요.')
rows=[{'id':p['id'],'text_ko':translations[p['id']]} for p in original]
(root/'data/posts.ko.json').write_text(json.dumps(rows,ensure_ascii=False,separators=(',',':')),encoding='utf8')
meta={'language':'ko','method':'Parallel machine translation: gpt-6.1-terra medium (4554 posts), gpt-6-luna low (5446 posts), with sampled review','workers_in_parallel':3,'source_sha256':hashlib.sha256((root/'data/posts.json').read_bytes()).hexdigest(),'count':len(rows),'original_preserved':True,'ranking_inputs':'original English text; unchanged','updated_at':datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).isoformat(),'coverage':report,'quality_note':'Machine translation. Ambiguity, slang and names may be mistranslated; original available per post.'}
(root/'data/translation-provenance.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf8')
