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
    // Temporary diagnostic: metadata only; never log credentials, URLs or raw records.
    if(!upstream.ok){
      console.log("PARTSHUB_CATALOG_DIAG",JSON.stringify({partNumber:articleNo||"health",upstreamStatus:upstream.status,success:false}));
      return {error:upstream.status};
    }
    try{
      const data=await upstream.json();
      const shape=data&&typeof data==="object"&&!Array.isArray(data)?"object":Array.isArray(data)?"array":typeof data;
      const keys=shape==="object"?Object.keys(data).slice(0,20):[];
      const articleCount=Array.isArray(data?.articles)?data.articles.length:null;
      const resultCount=Array.isArray(data?.results)?data.results.length:null;
      console.log("PARTSHUB_CATALOG_DIAG",JSON.stringify({partNumber:articleNo||"health",upstreamStatus:upstream.status,success:true,shape,keys,articleCount,resultCount}));
      return {data};
    }catch{
      console.log("PARTSHUB_CATALOG_DIAG",JSON.stringify({partNumber:articleNo||"health",upstreamStatus:upstream.status,success:false,invalidJson:true}));
      return {invalid:true};
    }
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
    // Opt-in comparison for two known test parts. Never expose upstream data or credentials.
    // Invoke with ?partNumber=R45TS&catalogDiag=1 or VS12869C; no customer-facing result changes.
    if(input.searchParams.get("catalogDiag")==="1"&&["R45TS","VS12869C"].includes(part.toUpperCase())){
      const target=new URL("/api/articles/article-number-details/type-id/1",base);
      target.searchParams.set("articleNo",part);
      target.searchParams.set("langId","4");
      try{
        const upstream=await fetch(target.toString(),{headers:{"x-apiprofile-key":env.AUTOPARTS_API_KEY,"accept":"application/json"},signal:AbortSignal.timeout(12000)});
        let diagnostic={partNumber:part,method:"article-number-details",upstreamStatus:upstream.status};
        if(upstream.ok){
          try{
            const value=await upstream.json();
            diagnostic.shape=Array.isArray(value)?"array":value===null?"null":typeof value;
            diagnostic.keys=value&&typeof value==="object"&&!Array.isArray(value)?Object.keys(value).slice(0,20):[];
            const articles=value&&typeof value==="object"?value.articles:undefined;
            const countArticles=value&&typeof value==="object"?value.countArticles:undefined;
            diagnostic.arrayLength=Array.isArray(value)?value.length:null;
            diagnostic.articlesType=articles===null?"null":Array.isArray(articles)?"array":typeof articles;
            diagnostic.articleCount=Array.isArray(articles)?articles.length:null;
            diagnostic.articlesKeys=articles&&typeof articles==="object"&&!Array.isArray(articles)?Object.keys(articles).slice(0,20):[];
            diagnostic.countArticlesType=countArticles===null?"null":typeof countArticles;
            diagnostic.countArticlesValue=["number","string","boolean"].includes(typeof countArticles)?countArticles:null;
            diagnostic.totalPages=value?.totalPages??null;
            diagnostic.resultCount=Array.isArray(value?.results)?value.results.length:null;
            diagnostic.dataPresent=Boolean(value&&typeof value==="object"&&(Array.isArray(value)?value.length>0:Object.keys(value).length>0));
          }catch{diagnostic.invalidJson=true}
        }
        console.log("PARTSHUB_ALTERNATE_DIAG",JSON.stringify(diagnostic));
      }catch{console.log("PARTSHUB_ALTERNATE_DIAG",JSON.stringify({partNumber:part,method:"article-number-details",networkError:true}))}
    }
    return reply({connected:true,provider:"AutoPartsAPI",partNumber:part,attemptedFormats:attempted,matchedFormat,catalogResults:data,pricesIncluded:false,fitmentVerified:false,notice:"Catalog results are not live retailer offers; verify vehicle fitment."});
  }catch{return reply({connected:false,error:"Catalog provider could not be reached"},502)}
}
