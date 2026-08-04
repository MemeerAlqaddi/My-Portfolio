const VALID_PRODUCTS=new Set(['all','arabish','ayah','conversation','mizan','culture','bundle']);
const send=(response,status,body)=>response.status(status).json(body);
export default async function handler(request,response){
  if(!['GET','POST'].includes(request.method)){response.setHeader('Allow','GET, POST');return send(response,405,{error:'Method not allowed.'});}
  const secretKey=process.env.STRIPE_SECRET_KEY;
  if(!secretKey)return send(response,503,{error:'Stripe is not configured yet.'});
  const sessionId=String(request.method==='GET'?request.query?.session_id||'':request.body?.sessionId||'');
  if(!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId))return send(response,400,{error:'Invalid Checkout Session.'});
  try{
    const stripeResponse=await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,{
      headers:{Authorization:`Bearer ${secretKey}`}
    });
    const session=await stripeResponse.json();
    if(!stripeResponse.ok)return send(response,404,{error:session?.error?.message||'Checkout Session could not be verified.'});
    const product=String(session.metadata?.al_majlis_product||'');
    const paid=session.status === 'complete' && session.payment_status === 'paid';
    if(!VALID_PRODUCTS.has(product))return send(response,400,{error:'This payment is not an Al Majlis purchase.'});
    response.setHeader('Cache-Control','no-store');
    return send(response,200,{paid,product:paid?product:null,customerEmail:paid?(session.customer_details?.email||null):null});
  }catch(error){
    console.error('Stripe verification failed:',error);
    return send(response,500,{error:'Checkout Session could not be verified.'});
  }
}
