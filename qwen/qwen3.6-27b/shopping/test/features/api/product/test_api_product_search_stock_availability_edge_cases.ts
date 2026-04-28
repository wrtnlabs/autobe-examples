import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformInventoryRecord";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { generate_random_ecommerce_platform_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_platform_inventory_record } from "../../../prepare/prepare_random_ecommerce_platform_inventory_record";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";

/**
 * Test availability status edge cases for products in customer search results.
 *
 * Validates that product search correctly reflects stock availability based on variant configuration: products with no variants show as 'unavailable', products with variants that have zero stock show as 'outOfStock', and products with at least one in-stock variant show as 'active'. Also verifies the inStockOnly filter correctly excludes unavailable and out-of-stock products.
 *
 * 1. Seller registers and creates three products with different stock states: no variants (unavailable), variants with zero stock (outOfStock), variants with positive stock (active).
 * 2. Customer searches without filters and verifies all three products appear with correct isAvailable values and variantCount.
 * 3. Customer searches with inStockOnly=true and verifies only the active product appears.
 */
export async function test_api_product_search_stock_availability_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create product 1: NO variants - will be 'unavailable'
  const productNoVariants =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(productNoVariants);
  // 3. Create product 2: with variants but ALL variants have zero stock - will be 'outOfStock'
  const productZeroStock =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(productZeroStock);
  // Create a variant for product 2 (initially has stock=0 from creation)
  const variantZeroStock =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: productZeroStock.id },
        body: {
          options: [
            {
              attributeKey: "color",
              attributeValue: "Red",
            },
          ],
        },
      },
    );
  typia.assert(variantZeroStock);
  // Stock is 0 by default after variant creation, no need to set inventory
  // 4. Create product 3: with variants and at least one variant with stock > 0 - will be 'active'
  const productActive =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(productActive);
  // Create a variant for product 3
  const variantActive =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: productActive.id },
        body: {
          options: [
            {
              attributeKey: "color",
              attributeValue: "Blue",
            },
          ],
        },
      },
    );
  typia.assert(variantActive);
  // Add stock to the variant to make it 'active'
  await generate_random_ecommerce_platform_seller_products_variants_inventory_create(
    sellerConnection,
    {
      params: { productId: productActive.id, variantId: variantActive.id },
      body: {
        quantity_delta: 10,
        reason: "Initial restocking for active product",
      },
    },
  );
  // 5. Customer setup - register customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 6. Customer searches without filters - all three products should appear
  const searchAll = await api.functional.ecommercePlatform.customer.search(
    customerConnection,
    {
      body: {
        sortBy: "newest",
      } satisfies IEcommercePlatformProduct.ISearch,
    },
  );
  typia.assert(searchAll);
  // Find our products in the search results
  const foundNoVariants = searchAll.data.find(
    (p) => p.id === productNoVariants.id,
  );
  const foundZeroStock = searchAll.data.find(
    (p) => p.id === productZeroStock.id,
  );
  const foundActive = searchAll.data.find((p) => p.id === productActive.id);
  // 7. Verify all three products appear with correct availability
  TestValidator.predicate(
    "product with no variants found in search",
    foundNoVariants !== undefined,
  );
  TestValidator.predicate(
    "product with zero stock variants found in search",
    foundZeroStock !== undefined,
  );
  TestValidator.predicate(
    "product with active variants found in search",
    foundActive !== undefined,
  );
  // 8. Verify isAvailable values
  if (foundNoVariants !== undefined) {
    TestValidator.equals(
      "no variants product has isAvailable=unavailable",
      foundNoVariants.isAvailable,
      "unavailable",
    );
    TestValidator.equals(
      "no variants product has variantCount=0",
      foundNoVariants.variantCount,
      0,
    );
  }
  if (foundZeroStock !== undefined) {
    TestValidator.equals(
      "zero stock product has isAvailable=outOfStock",
      foundZeroStock.isAvailable,
      "outOfStock",
    );
    TestValidator.predicate(
      "zero stock product has variantCount > 0",
      foundZeroStock.variantCount > 0,
    );
  }
  if (foundActive !== undefined) {
    TestValidator.equals(
      "active product has isAvailable=active",
      foundActive.isAvailable,
      "active",
    );
    TestValidator.predicate(
      "active product has variantCount > 0",
      foundActive.variantCount > 0,
    );
  }
  // 9. Customer searches with inStockOnly=true - only 'active' product should appear
  const searchInStock = await api.functional.ecommercePlatform.customer.search(
    customerConnection,
    {
      body: {
        inStockOnly: true,
        sortBy: "newest",
      } satisfies IEcommercePlatformProduct.ISearch,
    },
  );
  typia.assert(searchInStock);
  // 10. Verify only active product appears in inStockOnly search
  const inStockFoundNoVariants = searchInStock.data.find(
    (p) => p.id === productNoVariants.id,
  );
  const inStockFoundZeroStock = searchInStock.data.find(
    (p) => p.id === productZeroStock.id,
  );
  const inStockFoundActive = searchInStock.data.find(
    (p) => p.id === productActive.id,
  );
  TestValidator.predicate(
    "no variants product excluded from inStockOnly search",
    inStockFoundNoVariants === undefined,
  );
  TestValidator.predicate(
    "zero stock product excluded from inStockOnly search",
    inStockFoundZeroStock === undefined,
  );
  TestValidator.predicate(
    "active product included in inStockOnly search",
    inStockFoundActive !== undefined,
  );
  // 11. Verify the active product still shows correct isAvailable in filtered search
  if (inStockFoundActive !== undefined) {
    TestValidator.equals(
      "active product maintains isAvailable=active in filtered search",
      inStockFoundActive.isAvailable,
      "active",
    );
  }
}
