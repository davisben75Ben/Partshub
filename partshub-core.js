// PartsHub-owned catalog API, independent of external catalog credentials.
// Seed entries are identifier references, not verified vehicle fitment or retail inventory.
const seed=[
 {partNumber:"FL820S",brand:"Motorcraft",category:"Oil filter",source:"manual-seed",fitmentVerified:false},
 {partNumber:"R45TS",brand:"ACDelco",category:"Spark plug",source:"manual-seed",fitmentVerified:false}
];
const normalize=s=>String(s||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
export function handleCore(request){
 const url=new URL(request.url),path=url.pathname;
 if(path==="/api/core/health")return json({connected:true,service:"PartsHub Core",version:"0.1.0",seedCount:seed.length,externalCatalogRequired:false,pricesIncluded:false,fitmentDataAvailable:false});
 if(path!=="/api/core/search")return json({error:"Not found"},404);
 const partNumber=(url.searchParams.get("partNumber")||"").trim();
 if(!partNumber||partNumber.length>80||!/^[A-Za-z0-9 ._\\/-]+$/.test(partNumber))return json({error:"Enter a valid part number"},400);
 const key=normalize(partNumber);
 const matches=seed.filter(x=>normalize(x.partNumber)===key);
 return json({query:partNumber,normalizedPartNumber:key,count:matches.length,results:matches,source:"PartsHub-owned seed catalog",pricesIncluded:false,fitmentVerified:false,notice:"Identifier references only. No vehicle fitment, interchange, retailer stock or price is verified."});
}
