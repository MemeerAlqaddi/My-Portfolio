const PRODUCTS = Object.freeze({
  all:{name:'Game Night Shuffle',description:'Unlock the complete competitive shuffle.',amount:399},
  arabish:{name:'Decode the Gibberish',description:'Unlock the complete Arabic phrase challenge.',amount:299},
  ayah:{name:'Complete the Ayah',description:'Unlock the complete Quranic verse challenge.',amount:299},
  conversation:{name:'Conversation Shuffle',description:'Unlock the complete conversation shuffle.',amount:399},
  mizan:{name:'Dilemmas',description:'Unlock the complete Dilemmas collection.',amount:299},
  culture:{name:'Islam vs Culture',description:'Unlock the complete Islam vs Culture collection.',amount:299},
  bundle:{name:'Al Majlis Premium Collection',description:'Unlock every current premium game mode.',amount:799}
});
const send=(response,status,body)=>response.status(status).json(body);
function paramsFor(product, selected, origin){
  const p=new URLSearchParams();
  p.set('ui_mode','embedded');
  p.set('redirect_on_completion','if_required');
  p.set('mode','payment');
  p.set('payment_method_types[0]','card');
  p.set('payment_method_types[1]','link');
  p.set('line_items[0][quantity]','1');
  p.set('line_items[0][price_data][currency]','usd');
  p.set('line_items[0][price_data][unit_amount]',String(product.amount));
  p.set('line_items[0][price_data][product_data][name]',product.name);
  p.set('line_items[0][price_data][product_data][description]',product.description);
  p.set('metadata[al_majlis_product]',selected);
  p.set('metadata[al_majlis_version]','premium-v1');
  p.set('return_url',`${origin}/?checkout=return&session_id={CHECKOUT_SESSION_ID}`);
  return p;
}
export default async function handler(request,response){
  if(request.method!=='POST'){response.setHeader('Allow','POST');return send(response,405,{error:'Method not allowed.'});}
  const secretKey=process.env.STRIPE_SECRET_KEY;
  const publishableKey=process.env.STRIPE_PUBLISHABLE_KEY;
  if(!secretKey||!publishableKey)return send(response,503,{error:'Stripe is not configured yet. Add the Stripe environment variables in Vercel.'});
  const selected=String(request.body?.product||'');
  const product=PRODUCTS[selected];
  if(!product)return send(response,400,{error:'Unknown Al Majlis product.'});
  const origin=String(request.headers.origin||`https://${request.headers.host}`);
  if(!/^https?:\/\//.test(origin))return send(response,400,{error:'Invalid site origin.'});
  try{
    const stripeResponse=await fetch('https://api.stripe.com/v1/checkout/sessions',{
      method:'POST',
      headers:{Authorization:`Bearer ${secretKey}`,'Content-Type':'application/x-www-form-urlencoded'},
      body:paramsFor(product,selected,origin)
    });
    const session=await stripeResponse.json();
    if(!stripeResponse.ok)return send(response,502,{error:session?.error?.message||'Unable to open secure checkout. Please try again.'});
    return send(response,200,{clientSecret:session.client_secret,sessionId:session.id,publishableKey});
  }catch(error){
    console.error('Stripe session creation failed:',error);
    return send(response,500,{error:'Unable to open secure checkout. Please try again.'});
  }
}
