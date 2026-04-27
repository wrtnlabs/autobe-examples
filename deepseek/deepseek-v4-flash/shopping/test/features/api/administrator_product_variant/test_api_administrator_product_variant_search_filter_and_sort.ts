import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallInventoryRecord";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { generate_random_e_commerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Test search, filter, and sort capabilities of the administrator variant listing endpoint.
 *
 * Validates that the PATCH /eCommerceMall/administrator/products/{productId}/variants endpoint correctly supports partial SKU search, stock status filtering (in_stock / out_of_stock), combination queries, and sorting by price or creation date in both ascending and descending orders.
 *
 * Special attention is given to verifying pagination metadata (records count) against expected filtered result sizes.
 *
 * 1. Administrator creates own account, seller creates account and product with 3 variants (2 t-shirts with distinct colors, 1 hoodie).
 * 2. Inventory is added to 2 variants so one remains out of stock.
 * 3. Administrator queries variants with various combinations of search, filter, and sort parameters.
 * 4. Each query validates the correct record count and ordering.
 */
export async function test_api_administrator_product_variant_search_filter_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // Setup actor-specific connections
  const adminConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate administrator
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Authenticate seller
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller creates a product
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Seller creates 3 variants with distinct SKU codes and prices
  // Variant 1: TSHIRT-RED-L (price=10000)
  const variant1 =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "TSHIRT-RED-L",
          price: 10000,
          options: [
            { key: "size", value: "Large" },
            { key: "color", value: "Red" },
          ],
        },
      },
    );
  typia.assert(variant1);
  // Variant 2: TSHIRT-BLUE-L (price=15000)
  const variant2 =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "TSHIRT-BLUE-L",
          price: 15000,
          options: [
            { key: "size", value: "Large" },
            { key: "color", value: "Blue" },
          ],
        },
      },
    );
  typia.assert(variant2);
  // Variant 3: HOODIE-BLK-M (price=12000)
  const variant3 =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "HOODIE-BLK-M",
          price: 12000,
          options: [
            { key: "size", value: "Medium" },
            { key: "color", value: "Black" },
          ],
        },
      },
    );
  typia.assert(variant3);
  // 5. Add inventory to variant1 and variant2 (variant3 remains out of stock)
  await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant1.id },
      body: { quantity_change: 10, reason: "initial stock" },
    },
  );
  await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant2.id },
      body: { quantity_change: 10, reason: "initial stock" },
    },
  );
  // =========================================================
  // Test 1: Search by partial SKU code 'TSHIRT'
  // =========================================================
  const result1 =
    await api.functional.eCommerceMall.administrator.products.variants.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          search: "TSHIRT",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(result1);
  TestValidator.equals("search TSHIRT records", result1.pagination.records, 2);
  // =========================================================
  // Test 2: Filter by stock_status='in_stock'
  // =========================================================
  const result2 =
    await api.functional.eCommerceMall.administrator.products.variants.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          stock_status: "in_stock" as const,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(result2);
  TestValidator.equals(
    "filter in_stock records",
    result2.pagination.records,
    2,
  );
  // =========================================================
  // Test 3: Filter by stock_status='out_of_stock'
  // =========================================================
  const result3 =
    await api.functional.eCommerceMall.administrator.products.variants.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          stock_status: "out_of_stock" as const,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(result3);
  TestValidator.equals(
    "filter out_of_stock records",
    result3.pagination.records,
    1,
  );
  // =========================================================
  // Test 4: Combine search + stock_status
  // =========================================================
  const result4 =
    await api.functional.eCommerceMall.administrator.products.variants.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          search: "TSHIRT",
          stock_status: "in_stock" as const,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(result4);
  TestValidator.equals(
    "search TSHIRT + in_stock records",
    result4.pagination.records,
    2,
  );
  // =========================================================
  // Test 5: Sort by price ascending
  // =========================================================
  const result5 =
    await api.functional.eCommerceMall.administrator.products.variants.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          sort: "price" as const,
          direction: "asc" as const,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(result5);
  TestValidator.predicate(
    "price ascending has all variants",
    result5.data.length >= 3,
  );
  TestValidator.predicate(
    "price ascending order",
    result5.data.every(
      (v, i) =>
        i === 0 || result5.data[i - 1].effective_price <= v.effective_price,
    ),
  );
  // =========================================================
  // Test 6: Sort by price descending
  // =========================================================
  const result6 =
    await api.functional.eCommerceMall.administrator.products.variants.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          sort: "price" as const,
          direction: "desc" as const,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(result6);
  TestValidator.predicate(
    "price descending has all variants",
    result6.data.length >= 3,
  );
  TestValidator.predicate(
    "price descending order",
    result6.data.every(
      (v, i) =>
        i === 0 || result6.data[i - 1].effective_price >= v.effective_price,
    ),
  );
  // =========================================================
  // Test 7: Sort by created_at ascending
  // =========================================================
  const result7 =
    await api.functional.eCommerceMall.administrator.products.variants.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          sort: "created_at" as const,
          direction: "asc" as const,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(result7);
  TestValidator.predicate(
    "created_at ascending has all variants",
    result7.data.length >= 3,
  );
  TestValidator.predicate(
    "created_at ascending order",
    result7.data.every(
      (v, i) => i === 0 || result7.data[i - 1].created_at <= v.created_at,
    ),
  );
}
