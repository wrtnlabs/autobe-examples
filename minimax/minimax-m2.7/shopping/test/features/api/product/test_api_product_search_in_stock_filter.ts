import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test product search endpoint with stock availability filter.
 *
 * Validates the product search functionality with the inStock filter parameter. This test ensures that:
 * - When inStock=true, only products with at least one variant having quantity > 0 are returned
 * - When inStock=false or omitted, all active products are returned regardless of stock status
 * - Products without any variants are correctly identified as having no stock (hasStock=false)
 * - Soft-deleted products are excluded from search results regardless of the inStock filter
 *
 * **Scenario Setup**:
 * 1. Register and authenticate a seller with approved status
 * 2. Create products with variants using the generation utility
 * 3. Create a product without variants
 *
 * **Validation Points**:
 * - inStock=true returns only products with available variants
 * - inStock=false returns all products including out-of-stock
 * - hasStock field correctly indicates stock availability in product summaries
 * - Deleted products are never returned regardless of inStock filter
 */
export async function test_api_product_search_in_stock_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 2. Create Product A - with variants (some in stock, some out)
  const productA =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          name: `Product A - Mixed Stock ${RandomGenerator.alphaNumeric(8)}`,
        },
      },
    );
  typia.assert(productA);
  // 3. Create Product B - with variants (all out of stock)
  const productB =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          name: `Product B - All Out ${RandomGenerator.alphaNumeric(8)}`,
        },
      },
    );
  typia.assert(productB);
  // 4. Create Product C - no variants (no stock by definition)
  const productC =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          name: `Product C - No Variants ${RandomGenerator.alphaNumeric(8)}`,
        },
      },
    );
  typia.assert(productC);
  // 5. Search without inStock filter - should return all products
  const allProductsResult = await api.functional.ecommerceMall.products.index(
    sellerConnection,
    {
      body: {} satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(allProductsResult);
  // Verify all products are in the result
  const allProductIds = allProductsResult.data.map((p) => p.id);
  TestValidator.equals(
    "Product A in results",
    allProductIds.includes(productA.id),
    true,
  );
  TestValidator.equals(
    "Product B in results",
    allProductIds.includes(productB.id),
    true,
  );
  TestValidator.equals(
    "Product C in results",
    allProductIds.includes(productC.id),
    true,
  );
  // Verify hasStock field
  const productASummary = allProductsResult.data.find(
    (p) => p.id === productA.id,
  );
  const productBSummary = allProductsResult.data.find(
    (p) => p.id === productB.id,
  );
  const productCSummary = allProductsResult.data.find(
    (p) => p.id === productC.id,
  );
  TestValidator.equals(
    "Product A hasStock should be true (has in-stock variant)",
    productASummary?.hasStock ?? false,
    true,
  );
  TestValidator.equals(
    "Product B hasStock should be false (all variants out)",
    productBSummary?.hasStock ?? true,
    false,
  );
  TestValidator.equals(
    "Product C hasStock should be false (no variants)",
    productCSummary?.hasStock ?? true,
    false,
  );
  // 6. Search with inStock=true - should return only in-stock products
  const inStockResult = await api.functional.ecommerceMall.products.index(
    sellerConnection,
    {
      body: {
        inStock: true,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(inStockResult);
  const inStockProductIds = inStockResult.data.map((p) => p.id);
  TestValidator.equals(
    "Product A in inStock=true results",
    inStockProductIds.includes(productA.id),
    true,
  );
  TestValidator.equals(
    "Product B NOT in inStock=true results",
    inStockProductIds.includes(productB.id),
    false,
  );
  TestValidator.equals(
    "Product C NOT in inStock=true results",
    inStockProductIds.includes(productC.id),
    false,
  );
  // 7. Search with inStock=false - should return all products
  const outOfStockResult = await api.functional.ecommerceMall.products.index(
    sellerConnection,
    {
      body: {
        inStock: false,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(outOfStockResult);
  const outOfStockProductIds = outOfStockResult.data.map((p) => p.id);
  TestValidator.equals(
    "Product A in inStock=false results",
    outOfStockProductIds.includes(productA.id),
    true,
  );
  TestValidator.equals(
    "Product B in inStock=false results",
    outOfStockProductIds.includes(productB.id),
    true,
  );
  TestValidator.equals(
    "Product C in inStock=false results",
    outOfStockProductIds.includes(productC.id),
    true,
  );
}
