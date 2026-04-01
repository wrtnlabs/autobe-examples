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
 * Test inventory record retrieval for an adjustment-type record with negative quantity change.
 *
 * This test verifies the system's ability to track inventory decreases through manual adjustments.
 * The seller creates a product with variants, performs a manual inventory adjustment with a
 * negative quantity_change to represent stock loss/damage/correction, then retrieves and validates
 * the inventory record to ensure the negative quantity_change and reason code are correctly stored.
 *
 * Test Flow:
 * 1. Seller joins and authenticates
 * 2. Seller creates a product
 * 3. Seller creates an option definition for the product
 * 4. Seller creates option values under the option definition
 * 5. Seller creates a product variant using the option values
 * 6. Seller creates a manual inventory adjustment record with negative quantity_change
 * 7. Retrieve the inventory record by ID
 * 8. Validate the record contains correct negative quantity_change and reason code
 */
export async function test_api_inventory_record_retrieval_adjustment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
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
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create an option definition
  const optionDefinition =
    await generate_random_shopping_mall_seller_products_option_definitions_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { name: "Color" },
      },
    );
  typia.assert(optionDefinition);
  // 4. Create option values
  const optionValue1 =
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
  typia.assert(optionValue1);
  const optionValue2 =
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
  typia.assert(optionValue2);
  // 5. Create a product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price_override: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          option_value_ids: [optionValue1.id, optionValue2.id],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 6. Create manual inventory adjustment record with negative quantity_change
  const negativeQuantity = -typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const adjustmentRecord =
    await generate_random_shopping_mall_seller_inventory_records_create(
      sellerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity_change: negativeQuantity,
          reason: "damage",
        } satisfies IShoppingMallInventoryRecord.ICreate,
      },
    );
  typia.assert(adjustmentRecord);
  // 7. Retrieve the inventory record by ID
  const retrievedRecord =
    await api.functional.shoppingMall.seller.products.variants.inventory.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        recordId: adjustmentRecord.id,
      },
    );
  typia.assert(retrievedRecord);
  // 8. Validate the retrieved record
  TestValidator.equals(
    "record ID matches",
    retrievedRecord.id,
    adjustmentRecord.id,
  );
  TestValidator.equals(
    "product variant matches",
    retrievedRecord.productVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "negative quantity_change preserved",
    retrievedRecord.quantity_change,
    negativeQuantity,
  );
  TestValidator.equals(
    "reason code preserved",
    retrievedRecord.reason,
    "damage",
  );
  TestValidator.predicate(
    "quantity_change is negative",
    retrievedRecord.quantity_change < 0,
  );
}
