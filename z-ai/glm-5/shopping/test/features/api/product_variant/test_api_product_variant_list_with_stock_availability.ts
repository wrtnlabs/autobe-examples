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

/**
 * Test product variant listing with stock availability.
 *
 * Validates that:
 * 1. Variants are listed with correct stock quantities computed from inventory records
 * 2. Variants with positive stock are available for purchase
 * 3. Variants with zero stock are marked as out of stock
 * 4. SKU codes, option values, and prices are correctly returned
 */
export async function test_api_product_variant_list_with_stock_availability(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    },
  });
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        basePrice: typia.random<
          number & tags.Minimum<1> & tags.Maximum<100000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Create variants with different configurations
  const variantInStock =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-IN-${RandomGenerator.alphabets(8)}`.toUpperCase(),
          optionValues: {
            size: "Small",
            color: "Red",
          },
          price: null,
        },
      },
    );
  typia.assert(variantInStock);
  const variantOutOfStock =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-OUT-${RandomGenerator.alphabets(8)}`.toUpperCase(),
          optionValues: {
            size: "Large",
            color: "Blue",
          },
          price: 29.99,
        },
      },
    );
  typia.assert(variantOutOfStock);
  // 4. Add inventory records to set stock levels
  // Variant 1: Add positive stock (50 units)
  const inventoryInStock =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: variantInStock.id },
        body: {
          quantity_change: 50,
          reason: "Initial stock for in-stock variant test",
        },
      },
    );
  typia.assert(inventoryInStock);
  // Variant 2: Add zero stock (no inventory record means zero stock)
  // By not adding any inventory record, the stock should remain 0
  // 5. Call the variants listing API
  const response = await api.functional.shoppingMall.products.variants.index(
    connection,
    {
      productId: product.id,
      body: {
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(response);
  // 6. Validate response
  // Both variants should be returned
  TestValidator.equals("variant count", response.data.length, 2);
  // Find variants by ID
  const inStockVariant = response.data.find((v) => v.id === variantInStock.id);
  const outOfStockVariant = response.data.find(
    (v) => v.id === variantOutOfStock.id,
  );
  TestValidator.predicate(
    "in-stock variant exists",
    inStockVariant !== undefined,
  );
  TestValidator.predicate(
    "out-of-stock variant exists",
    outOfStockVariant !== undefined,
  );
  if (inStockVariant) {
    // Validate stock quantity for in-stock variant
    TestValidator.equals(
      "in-stock variant quantity",
      inStockVariant.stock_quantity,
      50,
    );
    TestValidator.equals(
      "in-stock variant SKU",
      inStockVariant.sku_code,
      variantInStock.skuCode,
    );
    TestValidator.equals(
      "in-stock variant size",
      inStockVariant.option_values.size,
      "Small",
    );
    TestValidator.equals(
      "in-stock variant color",
      inStockVariant.option_values.color,
      "Red",
    );
    TestValidator.equals("in-stock variant price", inStockVariant.price, null);
  }
  if (outOfStockVariant) {
    // Validate stock quantity for out-of-stock variant
    TestValidator.equals(
      "out-of-stock variant quantity",
      outOfStockVariant.stock_quantity,
      0,
    );
    TestValidator.equals(
      "out-of-stock variant SKU",
      outOfStockVariant.sku_code,
      variantOutOfStock.skuCode,
    );
    TestValidator.equals(
      "out-of-stock variant size",
      outOfStockVariant.option_values.size,
      "Large",
    );
    TestValidator.equals(
      "out-of-stock variant color",
      outOfStockVariant.option_values.color,
      "Blue",
    );
    TestValidator.equals(
      "out-of-stock variant price",
      outOfStockVariant.price,
      29.99,
    );
  }
  // Validate pagination metadata
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.equals("page limit", response.pagination.limit, 10);
  TestValidator.equals("total records", response.pagination.records, 2);
  TestValidator.equals("total pages", response.pagination.pages, 1);
}
