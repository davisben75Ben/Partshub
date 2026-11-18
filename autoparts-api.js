// PartsHub AutoPartsAPI adapter; server-side only.
// Configure Cloudflare secrets AUTOPARTS_API_KEY and AUTOPARTS_API_BASE_URL.
// Provider documentation: https://auto-parts-catalog.apiprofile.com/documentation
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
export async function handleAutoParts(request,env){
  const input=new URL(request.url);
  if(!["/api/catalog/health","/api/catalog/search"].includes(input.pathname))return reply({error:"Not found"},404);
  const configured=Boolean(env.AUTOPARTS_API_KEY&&env.AUTOPARTS_API_BASE_URL);
  if(!configured)return reply({connected:false,error:"Catalog API configuration incomplete",missing:{key:!env.AUTOPARTS_API_KEY,baseUrl:!env.AUTOPARTS_API_BASE_URL}},503);
  let base;
  try{base=new URL(env.AUTOPARTS_API_BASE_URL);if(base.protocol!=="https:"||base.username||base.password||base.search||base.hash)throw Error("Invalid base URL");}catch{return reply({error:"Invalid catalog API base URL"},500)}
  const part=input.searchParams.get("partNumber")?.trim();
  if(input.pathname.endsWith("/search")&&(!part||part.length>80||!/^[A-Za-z0-9 ._\/-]+$/.test(part)))return reply({error:"Enter a valid part number"},400);
  const target=new URL(input.pathname.endsWith("/health")?"/api/languages/list":"/api/articles/search-by-article-no",base);
  if(part){target.searchParams.set("articleNo",part);target.searchParams.set("langId","4")}
  try{
    const upstream=await fetch(target.toString(),{headers:{"x-apiprofile-key":env.AUTOPARTS_API_KEY,"accept":"application/json"},signal:AbortSignal.timeout(12000)});
    const payload=await upstream.text();
    if(!upstream.ok)return reply({connected:false,status:upstream.status,error:upstream.status===401?"API key rejected":upstream.status===403?"Subscription or quota unavailable":upstream.status===429?"Rate limited":"Catalog provider returned an error"},502);
    let data;try{data=JSON.parse(payload)}catch{return reply({error:"Provider returned invalid JSON"},502)}
    if(input.pathname.endsWith("/health"))return reply({connected:true,status:"authenticated",languageResponseReceived:true});
    return reply({connected:true,provider:"AutoPartsAPI",partNumber:part,catalogResults:data,pricesIncluded:false,fitmentVerified:false,notice:"Catalog results are not live retailer offers; verify vehicle fitment."});
  }catch{return reply({connected:false,error:"Catalog provider could not be reached"},502)}
}
