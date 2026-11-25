import React from 'react';
import { Search, Clock, TrendingUp, X } from 'lucide-react';
import { products } from '@/data/products';

const SearchSuggestions = ({ 
  query, 
  recentSearches, 
  onSelect, 
  onClearRecent 
}) => {
  const popularSearches = ["helmet", "gloves", "lights", "touring gear", "jacket"];
  
  const categoryCounts = products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});
  
  const brandCounts = products.reduce((acc, p) => {
    acc[p.brand] = (acc[p.brand] || 0) + 1;
    return acc;
  }, {});

  const topCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const topBrands = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  if (query) return null;

  return (
    <div className="p-4 bg-white border border-gray-200 shadow-lg rounded-b-md w-full text-sm font-bold text-[#0a0a0a]">
      {recentSearches.length > 0 && (
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between text-gray-800">
            <div className="flex items-center gap-2">
              <Clock size={16} strokeWidth={2.5} />
              <span>Recent Searches</span>
            </div>
            <button
              type="button"
              onClick={onClearRecent}
              className="text-xs font-bold text-gray-600 hover:text-[#e63946] transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((term, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelect(term)}
                className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 font-bold text-gray-800 transition-colors hover:bg-gray-200"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="mb-3 flex items-center gap-2 text-gray-800">
          <TrendingUp size={16} strokeWidth={2.5} />
          <span>Popular Searches</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {popularSearches.map((term, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(term)}
              className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 font-bold text-gray-800 transition-colors hover:border-[#e63946]"
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-4">
        <div>
          <div className="mb-2 text-xs uppercase tracking-wider text-gray-700">Top Categories</div>
          <ul className="space-y-2">
            {topCategories.map(([cat, count]) => (
              <li key={cat}>
                <button
                  type="button"
                  onClick={() => onSelect(cat)}
                  className="group flex w-full items-center justify-between text-gray-800 hover:text-[#0a0a0a]"
                >
                  <span>{cat}</span>
                  <span className="rounded bg-gray-100 px-1.5 text-xs font-bold text-gray-600 group-hover:bg-[#e63946]/20 group-hover:text-[#e63946]">
                    {count}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-2 text-xs uppercase tracking-wider text-gray-700">Top Brands</div>
          <ul className="space-y-2">
            {topBrands.map(([brand, count]) => (
              <li key={brand}>
                <button
                  type="button"
                  onClick={() => onSelect(brand)}
                  className="group flex w-full items-center justify-between text-gray-800 hover:text-[#0a0a0a]"
                >
                  <span>{brand}</span>
                  <span className="rounded bg-gray-100 px-1.5 text-xs font-bold text-gray-600 group-hover:bg-[#e63946]/20 group-hover:text-[#e63946]">
                    {count}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SearchSuggestions;