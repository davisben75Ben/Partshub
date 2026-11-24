// PartsHub AutoPartsAPI adapter; server-side only.
// Configure Cloudflare secrets AUTOPARTS_API_KEY and AUTOPARTS_API_BASE_URL.
// Provider documentation: https://auto-parts-catalog.apiprofile.com/documentation
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const positiveInt=value=>/^\d+$/.test(String(value||""))&&Number(value)>0?Number(value):null;
const validPart=value=>Boolean(value&&value.length<=80&&/^[A-Za-z0-9 ._\/-]+$/.test(value));
export async function handleAutoParts(request,env){
  const input=new URL(request.url);
  const routes=["/api/catalog/health","/api/catalog/search","/api/catalog/countries","/api/catalog/manufacturers","/api/catalog/models","/api/catalog/vehicles","/api/catalog/compatible-vehicles"];
  if(!routes.includes(input.pathname))return reply({error:"Not found"},404);
  if(request.method!=="GET")return reply({error:"Method not allowed"},405);
  const configured=Boolean(env.AUTOPARTS_API_KEY&&env.AUTOPARTS_API_BASE_URL);
  if(!configured)return reply({connected:false,error:"Catalog API configuration incomplete",missing:{key:!env.AUTOPARTS_API_KEY,baseUrl:!env.AUTOPARTS_API_BASE_URL}},503);
  let base;
  try{base=new URL(env.AUTOPARTS_API_BASE_URL);if(base.protocol!=="https:"||base.username||base.password||base.search||base.hash)throw Error("Invalid base URL");}catch{return reply({error:"Invalid catalog API base URL"},500)}
  const part=input.searchParams.get("partNumber")?.trim();
  if(input.pathname.endsWith("/search")&&(!validPart(part)))return reply({error:"Enter a valid part number"},400);
  const typeId=positiveInt(input.searchParams.get("typeId"));
  const manufacturerId=positiveInt(input.searchParams.get("manufacturerId"));
  const modelId=positiveInt(input.searchParams.get("modelId"));
  const countryFilterId=positiveInt(input.searchParams.get("countryFilterId"));
  const articleNo=input.searchParams.get("articleNo")?.trim();
  const supplierId=positiveInt(input.searchParams.get("supplierId"));
  let path;
  const query=new URLSearchParams();
  if(input.pathname.endsWith("/health"))path="/api/languages/list";
  else if(input.pathname.endsWith("/search")){path="/api/articles/search-by-article-no";query.set("articleNo",part);query.set("langId","4");}
  else if(input.pathname.endsWith("/countries"))path="/api/countries/list";
  else if(input.pathname.endsWith("/manufacturers")){
    if(![1,2,3].includes(typeId))return reply({error:"Choose a catalog vehicle type"},400);
    path="/api/manufacturers/list/type-id/"+typeId;
  }else if(input.pathname.endsWith("/models")){
    if(![1,2,3].includes(typeId)||!manufacturerId||!countryFilterId)return reply({error:"Vehicle type, make, and country are required"},400);
    path="/api/models/list/type-id/"+typeId+"/manufacturer-id/"+manufacturerId+"/lang-id/4/country-filter-id/"+countryFilterId;
  }else if(input.pathname.endsWith("/vehicles")){
    if(![1,2,3].includes(typeId)||!modelId||!countryFilterId)return reply({error:"Vehicle type, model, and country are required"},400);
    path="/api/types/type-id/"+typeId+"/list-vehicles-types/"+modelId+"/lang-id/4/country-filter-id/"+countryFilterId;
  }else{
    if(![1,2,3].includes(typeId)||!validPart(articleNo))return reply({error:"Choose a vehicle type and provide a valid article number"},400);
    path="/api/articles/get-compatible-cars-by-article-number/type-id/"+typeId;
    query.set("articleNo",articleNo);
    if(supplierId)query.set("supplierId",String(supplierId));
    query.set("langId","4");
    if(countryFilterId)query.set("countryFilterId",String(countryFilterId));
  }
  const target=new URL(path,base);
  query.forEach((value,key)=>target.searchParams.set(key,value));
  try{
    const upstream=await fetch(target.toString(),{headers:{"x-apiprofile-key":env.AUTOPARTS_API_KEY,"accept":"application/json"},signal:AbortSignal.timeout(12000)});
    const payload=await upstream.text();
    if(!upstream.ok)return reply({connected:false,status:upstream.status,error:upstream.status===401?"API key rejected":upstream.status===403?"Subscription or quota unavailable":upstream.status===429?"Rate limited":"Catalog provider returned an error"},502);
    let data;try{data=JSON.parse(payload)}catch{return reply({error:"Provider returned invalid JSON"},502)}
    if(input.pathname.endsWith("/health"))return reply({connected:true,status:"authenticated",languageResponseReceived:true});
    if(input.pathname.endsWith("/search"))return reply({connected:true,provider:"AutoPartsAPI",partNumber:part,catalogResults:data,pricesIncluded:false,fitmentVerified:false,notice:"Catalog results are not live retailer offers; verify vehicle fitment."});
    return reply({connected:true,provider:"AutoPartsAPI",data});
  }catch{return reply({connected:false,error:"Catalog provider could not be reached"},502)}
}
