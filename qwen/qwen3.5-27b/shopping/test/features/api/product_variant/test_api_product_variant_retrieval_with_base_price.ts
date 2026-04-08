import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that a seller can retrieve a variant that uses the product's base price (variant price is null).
 *
 * Validates the complete product variant retrieval workflow including seller authentication, product creation with base price, variant creation without price override, and variant retrieval. Ensures that when a variant's price field is null, the system correctly indicates that the product's base price should be used for cart calculations and order items.
 *
 * Special attention is given to verifying that the variant's price field is null in the response, confirming that no variant-specific price override exists and the product's base price will be inherited.
 *
 * 1. Seller registers and authenticates to access seller-specific endpoints.
 * 2. Seller creates a product with a specific base price (e.g., 10000).
 * 3. Seller creates a variant for the product with SKU code, NO price override (price field omitted), and option values.
 * 4. Seller retrieves the variant using GET endpoint with product ID and variant ID.
 * 5. Validates that the response contains IShoppingMallProductVariant with all fields.
 * 6. Validates that price field in response is null (indicating no variant-specific override).
 * 7. Validates that options array contains all option key-value pairs provided during variant creation.
 * 8. Validates that inventory_count equals the initial stock quantity.
 * 9. Validates that the variant is properly associated with the product and both are active.
 */
export async function test_api_product_variant_retrieval_with_base_price(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {},
  });
  // 2. Create a product with a specific base price
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        base_price: 10000,
      },
    },
  );
  typia.assert(product);
  // 3. Create a variant without price override
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: "TEST-VARIANT-001",
          price: null,
          variantOptions: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          initialStockQuantity: 100,
        },
      },
    );
  typia.assert(variant);
  // 4. Retrieve the variant
  const retrievedVariant =
    await api.functional.shoppingMall.seller.products.variants.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
      },
    );
  typia.assert(retrievedVariant);
  // 5. Validate that price field is null (no variant-specific override)
  TestValidator.equals(
    "price is null (uses base price)",
    retrievedVariant.price,
    null,
  );
  // 6. Validate SKU code matches
  TestValidator.equals(
    "sku_code matches",
    retrievedVariant.sku_code,
    "TEST-VARIANT-001",
  );
  // 7. Validate options array contains the expected option key-value pairs
  TestValidator.equals("options count", retrievedVariant.options.length, 2);
  TestValidator.equals(
    "first option key",
    retrievedVariant.options[0].key,
    "color",
  );
  TestValidator.equals(
    "first option value",
    retrievedVariant.options[0].value,
    "Red",
  );
  TestValidator.equals(
    "second option key",
    retrievedVariant.options[1].key,
    "size",
  );
  TestValidator.equals(
    "second option value",
    retrievedVariant.options[1].value,
    "Large",
  );
  // 8. Validate inventory count matches initial stock quantity
  TestValidator.equals(
    "inventory_count matches initial stock",
    retrievedVariant.inventory_count,
    100,
  );
  // 9. Validate variant is active (not deleted)
  TestValidator.equals(
    "variant is active (not deleted)",
    retrievedVariant.deleted_at,
    null,
  );
  // 10. Validate product is active (not deleted)
  TestValidator.equals(
    "product is active (not deleted)",
    product.deleted_at,
    null,
  );
}
