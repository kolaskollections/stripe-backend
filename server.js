const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const inventoryPath = path.join(__dirname, 'inventory.json');

function readInventory() {
  return JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
}

function writeInventory(data) {
  fs.writeFileSync(inventoryPath, JSON.stringify(data, null, 2));
}

app.use(cors());

app.get('/', (req, res) => {
  res.send('Backend is running');
});

app.get('/inventory', (req, res) => {
  const inventory = readInventory();
  res.json(inventory);
});

app.post('/create-checkout-session', express.json(), async (req, res) => {
  try {
    const items = req.body.items || [];
    const inventory = readInventory();

    if (!items.length) {
      return res.status(400).json({ error: 'Cart is empty.' });
    }

    for (const item of items) {
      const product = inventory[item.name];

      if (!product) {
        return res.status(400).json({ error: `${item.name} does not exist.` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `${item.name} is out of stock or low on stock.` });
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: items.map(item => ({
        price_data: {
          currency: 'cad',
          product_data: {
            name: item.name
          },
          unit_amount: Math.round(item.price * 100)
        },
        quantity: item.quantity
      })),
      success_url: 'https://kolaskollections.ca/success.html',
      cancel_url: 'https://kolaskollections.ca/cart.html',
      metadata: {
        cart: JSON.stringify(items)
      }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Create checkout error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const cart = JSON.parse(session.metadata.cart || '[]');

    const inventory = readInventory();

    for (const item of cart) {
      if (inventory[item.name]) {
        inventory[item.name].stock = Math.max(
          0,
          inventory[item.name].stock - item.quantity
        );
      }
    }

    writeInventory(inventory);
    console.log('Stock updated after successful checkout.');
  }

  res.json({ received: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
