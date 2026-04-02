const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const stripe = new Stripe(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);

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

    success_url: 'https://yourusername.github.io/your-repo-name/success.html',
cancel_url: 'https://yourusername.github.io/your-repo-name/cart.html',
  });

  res.json({ url: session.url });
});

app.listen(3000, () => console.log('Server running on port 3000'));