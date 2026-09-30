'use client';
import {useState} from 'react';
import materials from './learning-materials.json';

type TabSection={label:string;counts:string[];fingers:string[];notes:Record<string,string>[];barsAfter:number[]};
type TabExample={id:string;title:string;months:number[];task:string;rhythm:string;tempo:string;note:string;tuning:string;credit:string;variants:{label:string;sections:TabSection[]}[]};
type Video={id:string;title:string;teacher:string;months:number[];use:string;sourceUrl:string;kind:string};
type Song={id:string;title:string;month:number;role:string;sourceUrl:string;scoreUrl:string;scoreKind:string;scoreAccess:string;video:Video|null};
const T=materials.tabs as TabExample[];
const V=materials.videos as Video[];
const S=materials.songs as Song[];

function staff(section:TabSection){
 const line=(label:string,cells:string[],fill=' ')=>(label.padEnd(6,' ')+cells.map((cell,i)=>cell.padEnd(6,fill)+(section.barsAfter.includes(i)?'|':'')).join('')).trimEnd();
 return [line('Count',section.counts),line('Hand',section.fingers),...[1,2,3,4,5,6].map(string=>line(['','e(1)|','B(2)|','G(3)|','D(4)|','A(5)|','E(6)|'][string],section.notes.map(n=>n[String(string)]??'-'),'-'))].join('\n');
}
function TabCard({example,initialChord='Em',open=false}:{example:TabExample;initialChord?:string;open?:boolean}){
 const [variant,setVariant]=useState(example.variants.find(v=>v.label===initialChord)?.label??example.variants[0].label);
 const selected=example.variants.find(v=>v.label===variant)??example.variants[0];
 return <details className="tab-study" open={open}><summary>TAB · {example.title}</summary><div className="tab-study-body"><p className="tab-metadata">{example.tuning} · No capo for this example</p><p><b>{example.rhythm}</b><br/>{example.tempo}</p>{example.variants.length>1&&<div className="tab-variants" role="group" aria-label={`Chord for ${example.title}`}>{example.variants.map(v=><button type="button" key={v.label} aria-pressed={variant===v.label} onClick={()=>setVariant(v.label)}>{v.label}</button>)}</div>}{selected.sections.map(section=><figure key={section.label}><figcaption>{section.label}</figcaption><pre tabIndex={0} aria-label={`${example.title}, ${section.label}, guitar TAB`}><code>{staff(section)}</code></pre></figure>)}<p>{example.note}</p><p className="tab-credit">{example.credit}</p></div></details>;
}
export function PracticeTabs({day,month,task,focus}:{day:number;month:number;task:string;focus:string}){
 let tabs=T.filter(t=>t.months.includes(month)&&t.task===task);
 if(month===1&&task==='picking')tabs=tabs.filter(t=>t.id==='pattern-a'||(t.id==='pinch'&&(/pinch/i.test(focus)||day>=15)));
 if(month===12&&task==='picking')tabs=tabs.slice(0,3);
 const chord=focus.includes('C–Am–Em–Am')?'C–Am–Em–Am loop':focus.includes('C–Am–Em–G')?'C–Am–Em–G loop':/on Am\b/.test(focus)?'Am':/on C\b/.test(focus)?'C':'Em';
 if(!tabs.length)return null;
 return <div className="practice-materials">{tabs.map(t=><TabCard key={`${day}/${t.id}`} example={t} initialChord={chord} open={day===1&&t.id==='pattern-a'}/>)}<details className="tab-legend"><summary>How to read this TAB</summary><p>{materials.legend}</p></details></div>;
}
function VideoCard({video}:{video:Video}){
 const [loaded,setLoaded]=useState(false);
 return <article className="lesson-video"><h3>{video.title}</h3><p className="tab-metadata">{video.teacher} · {video.kind}</p><p>{video.use}</p>{loaded?<div className="video-frame"><iframe title={`${video.title} — ${video.teacher}`} src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0`} loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/></div>:<button type="button" className="media-button" onClick={()=>setLoaded(true)}>Watch video here</button>}<div className="material-links"><a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer">Open on YouTube</a><a href={video.sourceUrl} target="_blank" rel="noopener noreferrer">{video.kind==='Performance'?'Artist / source page':'Teacher / source page'}</a></div>{loaded&&<p className="tab-credit">If the player is unavailable here, use “Open on YouTube”.</p>}</article>;
}
export function TechniqueVideos({month}:{month:number}){
 const videos=V.filter(v=>v.months.includes(month));
 if(!videos.length)return null;
 return <details className="material-details"><summary>Technique videos for this month</summary><div className="materials-stack">{videos.map(v=><VideoCard key={v.id} video={v}/>)}</div></details>;
}
export function SongMaterials({pieceId}:{pieceId:string}){
 const song=S.find(s=>s.id===pieceId);const [scoreLoaded,setScoreLoaded]=useState(false);
 if(!song)return null;
 const pdf=/\.pdf$/i.test(song.scoreUrl);
 return <details className="material-details song-materials"><summary>TAB / score & video · {song.title}</summary><div className="materials-stack"><div className="score-material"><h3>{song.scoreKind}</h3><p>{song.scoreAccess}</p><p className="material-links"><a href={song.scoreUrl} target="_blank" rel="noopener noreferrer">{pdf?'Open PDF':'Open TAB / score page'}</a><a href={song.sourceUrl} target="_blank" rel="noopener noreferrer">Full lesson / publisher</a></p>{pdf&&<><button type="button" className="media-button" onClick={()=>setScoreLoaded(v=>!v)}>{scoreLoaded?'Close score preview':'Preview score here'}</button>{scoreLoaded&&<><iframe className="score-frame" title={`${song.title} — teacher’s PDF score`} src={song.scoreUrl} loading="lazy"/><p className="tab-credit">If this preview does not open, use the PDF or full-lesson link above.</p></>}</>}</div>{song.video?<VideoCard video={song.video}/>:<p className="muted">Use the publisher or full-lesson link for the matching preview. Follow the tuning, capo and rhythm of that edition.</p>}</div></details>;
}
export function TabLibrary(){return <section className="panel tab-library"><h2>Practice TAB library</h2><p>{materials.legend}</p><p className="muted">These exercises are written for this plan. For a song arrangement, use that teacher’s matching TAB or score.</p><div className="materials-stack">{T.map(t=><TabCard key={t.id} example={t}/>)}</div></section>;}

export function getLearningMaterials(day:number){const month=Math.floor((day-1)/28)+1;return {legend:materials.legend,practiceTabs:T.filter(t=>t.months.includes(month)&&(t.id!=='pinch'||month!==1||day>=15)),techniqueVideos:V.filter(v=>v.months.includes(month)),repertoire:S.filter(s=>s.month===month)};}
