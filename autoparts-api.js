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
  const health=input.pathname.endsWith("/health");
  const variants=health?[]:[part];
  // Some supplier catalogs index a formatted trade number instead of its compact form.
  // Try one hyphenated variant only after a confirmed empty result; never claim interchangeability.
  if(!health&&/^[A-Za-z]{1,5}[0-9]{2,}[A-Za-z0-9]*$/.test(part)){
    const alternate=part.replace(/^([A-Za-z]{1,5})([0-9].*)$/,"$1-$2");
    if(alternate!==part)variants.push(alternate);
  }
  const requestProvider=async (articleNo)=>{
    const target=new URL(health?"/api/languages/list":"/api/articles/search-by-article-no",base);
    if(articleNo){target.searchParams.set("articleNo",articleNo);target.searchParams.set("langId","4")}
    const upstream=await fetch(target.toString(),{headers:{"x-apiprofile-key":env.AUTOPARTS_API_KEY,"accept":"application/json"},signal:AbortSignal.timeout(12000)});
    if(!upstream.ok)return {error:upstream.status};
    try{return {data:await upstream.json()}}catch{return {invalid:true}}
  };
  try{
    const first=await requestProvider(health?null:variants[0]);
    if(first.error)return reply({connected:false,status:first.error,error:first.error===401?"API key rejected":first.error===403?"Subscription or quota unavailable":first.error===429?"Rate limited":"Catalog provider returned an error"},502);
    if(first.invalid)return reply({error:"Provider returned invalid JSON"},502);
    if(health)return reply({connected:true,status:"authenticated",languageResponseReceived:true});
    let data=first.data,matchedFormat=variants[0],attempted=[variants[0]];
    if(Array.isArray(data?.articles)&&data.articles.length===0&&variants.length>1){
      const second=await requestProvider(variants[1]);
      attempted.push(variants[1]);
      if(second.data&&Array.isArray(second.data.articles)&&second.data.articles.length>0){
        data=second.data;matchedFormat=variants[1];
      }
    }
    return reply({connected:true,provider:"AutoPartsAPI",partNumber:part,attemptedFormats:attempted,matchedFormat,catalogResults:data,pricesIncluded:false,fitmentVerified:false,notice:"Catalog results are not live retailer offers; verify vehicle fitment."});
  }catch{return reply({connected:false,error:"Catalog provider could not be reached"},502)}
}
