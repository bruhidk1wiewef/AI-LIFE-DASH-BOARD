import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

// Service-role client: webhooks have no user session, so RLS must be bypassed
// with the service role key (server-only, never exposed to the client).
const supabaseAdmin = createServiceClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'missing_signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Webhook signature verification failed', err);
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      if (userId && session.subscription) {
        await supabaseAdmin
          .from('profiles')
          .update({
            plan: 'pro',
            stripe_subscription_id: session.subscription as string,
          })
          .eq('id', userId);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const isActive = sub.status === 'active' || sub.status === 'trialing';
      await supabaseAdmin
        .from('profiles')
        .update({ plan: isActive ? 'pro' : 'free' })
        .eq('stripe_subscription_id', sub.id);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await supabaseAdmin.from('profiles').update({ plan: 'free' }).eq('stripe_subscription_id', sub.id);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
