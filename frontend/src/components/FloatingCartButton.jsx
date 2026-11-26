import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '@/store/cartStore';

const FloatingCartButton = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const cartCount = useCartStore((state) =>
    state.items.reduce((acc, item) => acc + item.quantity, 0),
  );

  if (cartCount <= 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.75, type: 'spring', stiffness: 260, damping: 20 }}
    >
      <Link
        to="/cart"
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className="relative group flex items-center overflow-hidden rounded-full border-2 border-white bg-[#e63946] text-white shadow-2xl shadow-[#e63946]/35 transition-all duration-300 hover:bg-[#d62839] hover:shadow-[#e63946]/55"
        aria-label={`Cart, ${cartCount} items`}
      >
        <motion.div whileTap={{ scale: 0.92 }} className="relative flex items-center gap-2 px-4 py-4 sm:py-3.5">
          <span className="relative">
            <ShoppingCart className="h-6 w-6 shrink-0 transition-transform duration-300 group-hover:scale-110 sm:h-7 sm:w-7" strokeWidth={2.25} />
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#0a0a0a] px-1 text-[10px] font-bold leading-none text-white">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </span>

          <AnimatePresence>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                animate={{ opacity: 1, width: 'auto', marginLeft: 4 }}
                exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                className="hidden overflow-hidden whitespace-nowrap pr-1 text-sm font-black uppercase tracking-widest sm:inline-block"
              >
                View Cart
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </Link>
    </motion.div>
  );
};

export default FloatingCartButton;