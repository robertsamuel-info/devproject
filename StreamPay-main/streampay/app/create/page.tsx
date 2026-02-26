'use client';

import CreateStreamForm from '@/components/forms/CreateStreamForm';
import { motion } from 'framer-motion';

export default function CreatePage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-somnia-500 to-somnia-700 bg-clip-text text-transparent">
          Create Payment Stream
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Set up a real-time payment stream that flows money per-second to your recipient.
          Perfect for work payments, subscriptions, or gaming rewards.
        </p>
      </div>

      <CreateStreamForm />
    </motion.div>
  );
}
