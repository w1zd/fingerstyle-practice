import {getChatGPTUser} from '../../chatgpt-auth';
import {getStore} from '../../../db/store';
import curriculum from '../../curriculum.json';
const pieceIds=new Set([...curriculum.practicePieces.map(p=>p.id),...curriculum.goalPieces.flatMap(p=>p.stages.map(s=>s.id))]);
export const dynamic='force-dynamic';
const today=()=>{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Auckland',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const v=(key:string)=>parts.find(p=>p.type===key)?.value;return `${v('year')}-${v('month')}-${v('day')}`;};
const defaultProfile=()=>({planDay:1,goalMinutes:50,startedOn:today()});
const boundedInt=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=max;
const str=(v:unknown,max:number)=>typeof v==='string'&&v.length<=max;
const validDate=(v:unknown)=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||v<'2020-01-01'||v>today())return false;const d=new Date(v+'T12:00:00Z');return !isNaN(d.valueOf())&&d.toISOString().slice(0,10)===v;};
const headers={'Cache-Control':'no-store'};
export async function GET(){
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Sign in to load your saved practice.'},{status:401,headers});
 try{const db=getStore();const [profile,sessions,tests]=await Promise.all([
  db.prepare('SELECT data FROM practice_profiles WHERE user_id=?').bind(user.userId).first<{data:string}>(),
  db.prepare('SELECT data FROM practice_sessions WHERE user_id=? ORDER BY date DESC LIMIT 1000').bind(user.userId).all<{data:string}>(),
  db.prepare('SELECT data FROM practice_milestones WHERE user_id=? ORDER BY date DESC LIMIT 1000').bind(user.userId).all<{data:string}>()
 ]);return Response.json({profile:profile?JSON.parse(profile.data):defaultProfile(),sessions:sessions.results.map(r=>JSON.parse(r.data)),tests:tests.results.map(r=>JSON.parse(r.data))},{headers});}
 catch(error){console.error('practice load failed',error);return Response.json({error:'Your saved progress could not load. Please retry.'},{status:503,headers});}
}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Sign in to save your practice.'},{status:401,headers});
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Request origin does not match.'},{status:403,headers});
 // eslint-disable-next-line @typescript-eslint/no-explicit-any -- untrusted JSON, validated field by field below
 let body:any;try{body=await request.json();}catch{return Response.json({error:'Invalid check-in.'},{status:400,headers});}
 if(!body||typeof body!=='object')return Response.json({error:'Invalid check-in.'},{status:400,headers});
 try{
  const db=getStore();const saved=await db.prepare('SELECT data FROM practice_profiles WHERE user_id=?').bind(user.userId).first<{data:string}>();const profile=saved?JSON.parse(saved.data):defaultProfile();
  if(body.kind==='profile'){
   if(!boundedInt(body.planDay,1,336)||![15,45,50,60].includes(body.goalMinutes))return Response.json({error:'Choose a valid practice day and session length.'},{status:400,headers});
   const updated={...profile,planDay:body.planDay,goalMinutes:body.goalMinutes};await db.prepare('INSERT INTO practice_profiles(user_id,data) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data').bind(user.userId,JSON.stringify(updated)).run();return Response.json({profile:updated},{headers});
  }
  if(body.kind==='pieces'){
   const done=body.done;
   if(!Array.isArray(done)||done.length>pieceIds.size||done.some((x:unknown)=>typeof x!=='string'||!pieceIds.has(x)))return Response.json({error:'Choose valid pieces.'},{status:400,headers});
   const updated={...profile,pieces:[...new Set(done as string[])]};await db.prepare('INSERT INTO practice_profiles(user_id,data) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data').bind(user.userId,JSON.stringify(updated)).run();return Response.json({profile:updated},{headers});
  }
  if(body.kind==='session'){
   const s=body.session;const taskIds=['tune','coordination','picking','break','solo','ear','review'];
   if(!s||!validDate(s.date)||!boundedInt(s.planDay,1,336)||!boundedInt(s.minutes,0,300)||(s.tempo!==null&&!boundedInt(s.tempo,20,240))||!boundedInt(s.confidence,1,5)||!str(s.notes,3000)||!str(s.piece,120)||!str(s.nextFocus,500)||typeof s.rest!=='boolean'||!Array.isArray(s.completedTasks)||s.completedTasks.length>7||s.completedTasks.some((x:unknown)=>typeof x!=='string'||!taskIds.includes(x)))return Response.json({error:'Check your date, minutes, tempo and notes before saving.'},{status:400,headers});
   const session={date:s.date,planDay:s.planDay,minutes:s.rest?0:s.minutes,tempo:s.tempo,confidence:s.confidence,notes:s.notes,piece:s.piece,nextFocus:s.nextFocus,rest:s.rest,completedTasks:[...new Set(s.completedTasks)],updatedAt:new Date().toISOString()};
   await db.batch([db.prepare('INSERT INTO practice_profiles(user_id,data) VALUES(?,?) ON CONFLICT(user_id) DO NOTHING').bind(user.userId,JSON.stringify(profile)),db.prepare('INSERT INTO practice_sessions(user_id,date,data) VALUES(?,?,?) ON CONFLICT(user_id,date) DO UPDATE SET data=excluded.data').bind(user.userId,session.date,JSON.stringify(session))]);return Response.json({session},{headers});
  }
  if(body.kind==='test'){
   const t=body.test;const keys=['timing','clarity','continuity','balance','relaxation'];
   if(!t||!validDate(t.date)||!boundedInt(t.month,1,12)||typeof t.passed!=='boolean'||!str(t.notes,1500)||!str(t.recordingUrl,1000)||!t.scores||keys.some(k=>!boundedInt(t.scores[k],k==='balance'?-1:0,2)))return Response.json({error:'Complete a valid milestone review.'},{status:400,headers});
   if(t.recordingUrl){let u:URL;try{u=new URL(t.recordingUrl);}catch{return Response.json({error:'Use a complete recording link.'},{status:400,headers});}if(!['https:','http:'].includes(u.protocol))return Response.json({error:'Use an http or https recording link.'},{status:400,headers});}
   const test={date:t.date,month:t.month,passed:t.passed,notes:t.notes,recordingUrl:t.recordingUrl,scores:Object.fromEntries(keys.map(k=>[k,t.scores[k]])),updatedAt:new Date().toISOString()};
   await db.prepare('INSERT INTO practice_milestones(user_id,month,date,data) VALUES(?,?,?,?) ON CONFLICT(user_id,month,date) DO UPDATE SET data=excluded.data').bind(user.userId,String(test.month),test.date,JSON.stringify(test)).run();return Response.json({test},{headers});
  }
  return Response.json({error:'Unknown practice action.'},{status:400,headers});
 }catch(error){console.error('practice save failed',error);return Response.json({error:'This could not save. Your input is still here; please retry.'},{status:503,headers});}
}
