const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.post('/create-checkout-session', async (req, res) => {
  const items = req.body.items;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: items.map(item => ({
      price_data: {
        currency: 'cad',
        product_data: {
          name: item.name,
        },
        unit_amount: item.price * 100,
      },
      quantity: item.quantity,
    })),
    success_url: 'https://kolaskollections.github.io/ca/success.html',
    cancel_url: 'https://kolaskollections.github.io/ca/cart.html',
  });

  res.json({ url: session.url });
});

app.listen(3000, () => console.log('Server running on port 3000'));
