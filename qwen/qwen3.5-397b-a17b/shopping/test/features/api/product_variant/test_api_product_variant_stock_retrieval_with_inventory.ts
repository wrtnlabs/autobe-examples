import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_shopping_mall_seller_products_option_definitions_create } from "../../../generate/generate_random_shopping_mall_seller_products_option_definitions_create";
import { generate_random_shopping_mall_seller_products_option_definitions_option_values_create } from "../../../generate/generate_random_shopping_mall_seller_products_option_definitions_option_values_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_option_definition } from "../../../prepare/prepare_random_shopping_mall_product_option_definition";
import { prepare_random_shopping_mall_product_option_value } from "../../../prepare/prepare_random_shopping_mall_product_option_value";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test retrieving stock quantity for a product variant that has inventory records.
 *
 * Scenario:
 * 1. Seller authenticates via join
 * 2. Seller creates a product with required fields (name, description, category_id, base_price)
 * 3. Seller creates an option definition for the product (e.g., 'Color')
 * 4. Seller creates option values under the definition (e.g., 'Red')
 * 5. Seller creates a variant with SKU code and option value IDs
 * 6. Seller adds inventory to the variant by creating inventory records with positive quantity changes
 * 7. Seller retrieves the stock for the variant
 *
 * Validation Points:
 * - Response contains stock field with correct calculated value (sum of all inventory record quantity_change values)
 * - Response contains isOutOfStock field set to false when stock > 0
 * - Stock calculation accurately reflects all inventory adjustments
 * - Variant ownership is validated (seller can only access variants from their own products)
 */
export async function test_api_product_variant_stock_retrieval_with_inventory(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create an option definition (e.g., 'Color')
  const optionDefinition =
    await generate_random_shopping_mall_seller_products_option_definitions_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { name: "Color" },
      },
    );
  typia.assert(optionDefinition);
  // 4. Create option values (e.g., 'Red', 'Blue')
  const optionValueRed =
    await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          optionDefinitionId: optionDefinition.id,
        },
        body: { name: "Red" },
      },
    );
  typia.assert(optionValueRed);
  const optionValueBlue =
    await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          optionDefinitionId: optionDefinition.id,
        },
        body: { name: "Blue" },
      },
    );
  typia.assert(optionValueBlue);
  // 5. Create a variant with SKU code and option value IDs
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          option_value_ids: [optionValueRed.id],
        },
      },
    );
  typia.assert(variant);
  // 6. Add inventory records to establish positive stock quantity
  const inventoryRecord1 =
    await generate_random_shopping_mall_seller_inventory_records_create(
      sellerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity_change: 50,
          reason: "restock",
        },
      },
    );
  typia.assert(inventoryRecord1);
  const inventoryRecord2 =
    await generate_random_shopping_mall_seller_inventory_records_create(
      sellerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity_change: 30,
          reason: "restock",
        },
      },
    );
  typia.assert(inventoryRecord2);
  const inventoryRecord3 =
    await generate_random_shopping_mall_seller_inventory_records_create(
      sellerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity_change: -10,
          reason: "adjustment",
        },
      },
    );
  typia.assert(inventoryRecord3);
  // 7. Retrieve the stock for the variant
  const stock =
    await api.functional.shoppingMall.seller.products.variants.stock.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
      },
    );
  typia.assert(stock);
  // Validate stock calculation: 50 + 30 - 10 = 70
  TestValidator.equals("stock quantity", stock.stock, 70);
  TestValidator.equals(
    "isOutOfStock should be false",
    stock.isOutOfStock,
    false,
  );
}
