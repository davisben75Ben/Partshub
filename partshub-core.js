// PartsHub catalog API: D1 first, legacy references only until a database is bound.
const seed=[
 {partNumber:"FL820S",brand:"Motorcraft",category:"Oil filter",source:"manual-seed",fitmentVerified:false},
 {partNumber:"R45TS",brand:"ACDelco",category:"Spark plug",source:"manual-seed",fitmentVerified:false}
];
const normalize=s=>String(s||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
export async function handleCore(request,env={}){
 const url=new URL(request.url),path=url.pathname;
 if(path!=="/api/core/health"&&path!=="/api/core/search")return json({error:"Not found"},404);
 const db=env.DB;
 if(path==="/api/core/health"){
  if(!db)return json({connected:true,service:"PartsHub Core",version:"0.2.0",catalogStorage:"seed-only",databaseConnected:false,seedCount:seed.length,pricesIncluded:false,fitmentDataAvailable:false});
  try{const check=await db.prepare("SELECT COUNT(*) AS count FROM parts").first();
   return json({connected:true,service:"PartsHub Core",version:"0.2.0",catalogStorage:"d1",databaseConnected:true,partCount:check?.count??0,pricesIncluded:false,fitmentDataAvailable:false});
  }catch{return json({connected:false,service:"PartsHub Core",databaseConnected:false,error:"Database schema unavailable"},503)}
 }
 const partNumber=(url.searchParams.get("partNumber")||"").trim();
 if(!partNumber||partNumber.length>80||!/^[A-Za-z0-9 ._\\/-]+$/.test(partNumber))return json({error:"Enter a valid part number"},400);
 const key=normalize(partNumber);
 if(db){
  try{
   const result=await db.prepare("SELECT p.part_number AS partNumber,b.name AS brand,p.category,p.description,p.verification_status AS verificationStatus,p.source_name AS source FROM parts p JOIN brands b ON b.id=p.brand_id WHERE p.normalized_number=? AND p.verification_status!='rejected' LIMIT 50").bind(key).all();
   const matches=(result.results||[]).map(x=>({...x,fitmentVerified:false}));
   return json({query:partNumber,normalizedPartNumber:key,count:matches.length,results:matches,source:"PartsHub D1 catalog",databaseConnected:true,pricesIncluded:false,fitmentVerified:false,notice:"Part records do not establish fitment, interchange, stock or price."});
  }catch{return json({error:"Database query unavailable",databaseConnected:false},503)}
 }
 const matches=seed.filter(x=>normalize(x.partNumber)===key);
 return json({query:partNumber,normalizedPartNumber:key,count:matches.length,results:matches,source:"PartsHub-owned seed catalog",databaseConnected:false,pricesIncluded:false,fitmentVerified:false,notice:"Identifier references only. D1 is not connected. No fitment, interchange, stock or price is verified."});
}
