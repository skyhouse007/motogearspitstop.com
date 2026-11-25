import { useMemo } from 'react';
import { products } from '@/data/products';
import useCatalogOverrideStore from '@/store/catalogOverrideStore';
import { mergeCatalogProduct } from '@/utils/mergeCatalogProduct';

export function useMergedCatalogProducts() {
  const overrides = useCatalogOverrideStore((s) => s.overrides);

  return useMemo(
  () => products.map((product) => mergeCatalogProduct(product, overrides[String(product.id)])),
    [overrides],
  );
}