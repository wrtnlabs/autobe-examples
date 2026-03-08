import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_variant_filter_by_stock_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a product for testing variants
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create variants with different stock states
  // Variant A: Will have positive stock (in_stock)
  const variantA =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-IN-${RandomGenerator.alphaNumeric(6)}`,
          optionValues: { color: "Red", size: "M" },
        },
      },
    );
  typia.assert(variantA);
  // Variant B: Will have negative stock (out_of_stock)
  const variantB =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-NEG-${RandomGenerator.alphaNumeric(6)}`,
          optionValues: { color: "Blue", size: "L" },
        },
      },
    );
  typia.assert(variantB);
  // Variant C: No inventory records (out_of_stock, stock = 0)
  const variantC =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-NO-INV-${RandomGenerator.alphaNumeric(6)}`,
          optionValues: { color: "Green", size: "S" },
        },
      },
    );
  typia.assert(variantC);
  // 4. Add inventory records to create different stock states
  // Variant A: Add 100 units (positive stock)
  await generate_random_shopping_mall_seller_variants_inventory_records_create(
    sellerConnection,
    {
      params: { variantId: variantA.id },
      body: {
        quantity_change: 100,
        reason: "Initial inventory stock for variant A",
      },
    },
  );
  // Variant B: Add positive then negative to get negative stock (-5)
  await generate_random_shopping_mall_seller_variants_inventory_records_create(
    sellerConnection,
    {
      params: { variantId: variantB.id },
      body: {
        quantity_change: 10,
        reason: "Initial stock for variant B",
      },
    },
  );
  await generate_random_shopping_mall_seller_variants_inventory_records_create(
    sellerConnection,
    {
      params: { variantId: variantB.id },
      body: {
        quantity_change: -15,
        reason: "Damaged goods removal for variant B",
      },
    },
  );
  // 5. Test filtering by stock status = 'in_stock'
  const inStockResponse =
    await api.functional.shoppingMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          stockStatus: "in_stock",
          limit: 100,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(inStockResponse);
  // Verify: Only Variant A (stock > 0) should appear
  const inStockIds = new Set(inStockResponse.data.map((v) => v.id));
  TestValidator.predicate(
    "Variant A should be in 'in_stock' results",
    inStockIds.has(variantA.id),
  );
  TestValidator.predicate(
    "Variant B should NOT be in 'in_stock' results",
    !inStockIds.has(variantB.id),
  );
  TestValidator.predicate(
    "Variant C should NOT be in 'in_stock' results",
    !inStockIds.has(variantC.id),
  );
  // Verify all returned variants have positive stock
  for (const variant of inStockResponse.data) {
    TestValidator.predicate(
      `Variant ${variant.sku_code} should have positive stock`,
      variant.stock_quantity > 0,
    );
  }
  // 6. Test filtering by stock status = 'out_of_stock'
  const outOfStockResponse =
    await api.functional.shoppingMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          stockStatus: "out_of_stock",
          limit: 100,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(outOfStockResponse);
  // Verify: Variants B (negative stock) and C (zero stock) should appear
  const outOfStockIds = new Set(outOfStockResponse.data.map((v) => v.id));
  TestValidator.predicate(
    "Variant A should NOT be in 'out_of_stock' results",
    !outOfStockIds.has(variantA.id),
  );
  TestValidator.predicate(
    "Variant B should be in 'out_of_stock' results",
    outOfStockIds.has(variantB.id),
  );
  TestValidator.predicate(
    "Variant C should be in 'out_of_stock' results",
    outOfStockIds.has(variantC.id),
  );
  // Verify all returned variants have zero or negative stock
  for (const variant of outOfStockResponse.data) {
    TestValidator.predicate(
      `Variant ${variant.sku_code} should have zero or negative stock`,
      variant.stock_quantity <= 0,
    );
  }
  // 7. Verify pagination metadata reflects correct filtered counts
  TestValidator.equals(
    "in_stock count should be 1",
    inStockResponse.pagination.records,
    1,
  );
  TestValidator.equals(
    "out_of_stock count should be 2",
    outOfStockResponse.pagination.records,
    2,
  );
}
