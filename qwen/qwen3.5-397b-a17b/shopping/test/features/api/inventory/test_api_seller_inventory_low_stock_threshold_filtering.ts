import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_inventory_records_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test the low-stock product listing endpoint with threshold-based filtering.
 *
 * This test validates:
 * 1. Seller authentication and product creation
 * 2. Multiple products with variants at different stock levels
 * 3. Threshold-based filtering (threshold=10)
 * 4. Correct aggregation of stock across all variants
 * 5. Sorting by current_stock ascending (lowest stock first)
 * 6. Response structure validation (id, name, sku_codes, current_stock, threshold)
 *
 * Test data setup:
 * - Product A: 2 variants with stock 3 + 5 = 8 (below threshold, should be included)
 * - Product B: 2 variants with stock 15 + 20 = 35 (above threshold, should be excluded)
 * - Product C: 2 variants with stock 0 + 2 = 2 (below threshold, should be included)
 * - Product D: 2 variants with stock 7 + 4 = 11 (above threshold, should be excluded)
 */
export async function test_api_seller_inventory_low_stock_threshold_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create 4 products for testing
  const productA = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Low Stock Product A",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: 10000,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(productA);
  const productB = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "High Stock Product B",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: 15000,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(productB);
  const productC = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Very Low Stock Product C",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: 20000,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(productC);
  const productD = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Borderline Stock Product D",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: 25000,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(productD);
  // 3. Create 2 variants for each product
  const variantA1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: productA.id },
        body: {
          sku_code: "SKU-A-001",
          price_override: null,
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variantA1);
  const variantA2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: productA.id },
        body: {
          sku_code: "SKU-A-002",
          price_override: null,
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variantA2);
  const variantB1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: productB.id },
        body: {
          sku_code: "SKU-B-001",
          price_override: null,
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variantB1);
  const variantB2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: productB.id },
        body: {
          sku_code: "SKU-B-002",
          price_override: null,
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variantB2);
  const variantC1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: productC.id },
        body: {
          sku_code: "SKU-C-001",
          price_override: null,
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variantC1);
  const variantC2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: productC.id },
        body: {
          sku_code: "SKU-C-002",
          price_override: null,
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variantC2);
  const variantD1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: productD.id },
        body: {
          sku_code: "SKU-D-001",
          price_override: null,
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variantD1);
  const variantD2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: productD.id },
        body: {
          sku_code: "SKU-D-002",
          price_override: null,
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variantD2);
  // 4. Create inventory records to establish stock levels
  // Product A: 3 + 5 = 8 (below threshold 10, should be included)
  await generate_random_shopping_mall_seller_inventory_records_create(
    sellerConnection,
    {
      body: {
        product_variant_id: variantA1.id,
        quantity_change: 3,
        reason: "restock",
      } satisfies IShoppingMallInventoryRecord.ICreate,
    },
  );
  await generate_random_shopping_mall_seller_inventory_records_create(
    sellerConnection,
    {
      body: {
        product_variant_id: variantA2.id,
        quantity_change: 5,
        reason: "restock",
      } satisfies IShoppingMallInventoryRecord.ICreate,
    },
  );
  // Product B: 15 + 20 = 35 (above threshold 10, should be excluded)
  await generate_random_shopping_mall_seller_inventory_records_create(
    sellerConnection,
    {
      body: {
        product_variant_id: variantB1.id,
        quantity_change: 15,
        reason: "restock",
      } satisfies IShoppingMallInventoryRecord.ICreate,
    },
  );
  await generate_random_shopping_mall_seller_inventory_records_create(
    sellerConnection,
    {
      body: {
        product_variant_id: variantB2.id,
        quantity_change: 20,
        reason: "restock",
      } satisfies IShoppingMallInventoryRecord.ICreate,
    },
  );
  // Product C: 0 + 2 = 2 (below threshold 10, should be included)
  // variantC1 has no inventory records (0 stock by default)
  await generate_random_shopping_mall_seller_inventory_records_create(
    sellerConnection,
    {
      body: {
        product_variant_id: variantC2.id,
        quantity_change: 2,
        reason: "restock",
      } satisfies IShoppingMallInventoryRecord.ICreate,
    },
  );
  // Product D: 7 + 4 = 11 (above threshold 10, should be excluded)
  await generate_random_shopping_mall_seller_inventory_records_create(
    sellerConnection,
    {
      body: {
        product_variant_id: variantD1.id,
        quantity_change: 7,
        reason: "restock",
      } satisfies IShoppingMallInventoryRecord.ICreate,
    },
  );
  await generate_random_shopping_mall_seller_inventory_records_create(
    sellerConnection,
    {
      body: {
        product_variant_id: variantD2.id,
        quantity_change: 4,
        reason: "restock",
      } satisfies IShoppingMallInventoryRecord.ICreate,
    },
  );
  // 5. Call low-stock endpoint with threshold=10
  const threshold = 10;
  const lowStockResult =
    await api.functional.shoppingMall.seller.products.inventory.low_stock.index(
      sellerConnection,
      {
        body: {
          threshold: threshold,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallProduct.ILowStockRequest,
      },
    );
  typia.assert(lowStockResult);
  // 6. Validate pagination
  TestValidator.equals("current page", lowStockResult.pagination.current, 1);
  TestValidator.predicate(
    "limit is valid",
    lowStockResult.pagination.limit >= 2,
  );
  TestValidator.equals("records count", lowStockResult.pagination.records, 2);
  TestValidator.equals("total pages", lowStockResult.pagination.pages, 1);
  // 7. Validate only products below threshold are returned
  TestValidator.equals(
    "only 2 products below threshold",
    lowStockResult.data.length,
    2,
  );
  // 8. Extract product IDs for validation
  const returnedProductIds = lowStockResult.data.map((item) => item.id);
  TestValidator.predicate(
    "Product A included (stock=8)",
    returnedProductIds.includes(productA.id),
  );
  TestValidator.predicate(
    "Product C included (stock=2)",
    returnedProductIds.includes(productC.id),
  );
  TestValidator.predicate(
    "Product B excluded (stock=35)",
    !returnedProductIds.includes(productB.id),
  );
  TestValidator.predicate(
    "Product D excluded (stock=11)",
    !returnedProductIds.includes(productD.id),
  );
  // 9. Validate sorting by current_stock ascending (lowest first)
  TestValidator.equals(
    "first product is lowest stock (Product C=2)",
    lowStockResult.data[0].id,
    productC.id,
  );
  TestValidator.equals(
    "first product stock",
    lowStockResult.data[0].current_stock,
    2,
  );
  TestValidator.equals(
    "second product is Product A (stock=8)",
    lowStockResult.data[1].id,
    productA.id,
  );
  TestValidator.equals(
    "second product stock",
    lowStockResult.data[1].current_stock,
    8,
  );
  // 10. Validate response structure for each item
  for (const item of lowStockResult.data) {
    TestValidator.predicate("has non-empty name", item.name.length > 0);
    TestValidator.predicate(
      "has sku_codes array",
      Array.isArray(item.sku_codes),
    );
    TestValidator.predicate(
      "sku_codes has at least one entry",
      item.sku_codes.length >= 1,
    );
    TestValidator.predicate(
      "current_stock is below threshold",
      item.current_stock < threshold,
    );
    TestValidator.equals(
      "threshold matches request",
      item.threshold,
      threshold,
    );
  }
  // 11. Validate specific SKU codes
  const productAItem = lowStockResult.data.find(
    (item) => item.id === productA.id,
  );
  TestValidator.predicate(
    "Product A has SKU-A-001",
    productAItem!.sku_codes.includes("SKU-A-001"),
  );
  TestValidator.predicate(
    "Product A has SKU-A-002",
    productAItem!.sku_codes.includes("SKU-A-002"),
  );
  const productCItem = lowStockResult.data.find(
    (item) => item.id === productC.id,
  );
  TestValidator.predicate(
    "Product C has SKU-C-001",
    productCItem!.sku_codes.includes("SKU-C-001"),
  );
  TestValidator.predicate(
    "Product C has SKU-C-002",
    productCItem!.sku_codes.includes("SKU-C-002"),
  );
}
