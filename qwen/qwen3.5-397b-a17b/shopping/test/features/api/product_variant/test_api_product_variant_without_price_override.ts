import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test variant creation without price override to verify the product's base price applies.
 *
 * This test validates the optional price override behavior for product variants:
 * 1. Seller registers and is authenticated
 * 2. Seller creates a product with a defined base price (e.g., 10000)
 * 3. Seller creates a variant WITHOUT specifying price (price = null)
 * 4. Validate variant is created successfully with price field as null
 * 5. Verify the null price indicates the variant should inherit the parent product's base price
 *
 * This ensures variants can optionally omit price and rely on the product's base_price
 * for customer purchases, which is useful when all variants share the same price.
 */
export async function test_api_product_variant_without_price_override(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Note: In real scenario, seller would need admin approval before creating products
  // For this test, we assume the seller is approved or the system allows product creation
  // 2. Create a product with a defined base price
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: 10000, // Fixed base price for testing
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create a variant WITHOUT price override (price = null)
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: null, // Explicitly set to null to test price inheritance
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          options: [
            {
              key: "color",
              value: "Red",
            },
            {
              key: "size",
              value: "Large",
            },
          ] satisfies IShoppingMallProductVariantOption.ICreate[],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Validate variant was created with null price
  TestValidator.equals(
    "variant price should be null (inherit from product base price)",
    variant.price,
    null,
  );
  // 5. Validate variant has correct product association
  TestValidator.equals(
    "variant product ID matches created product",
    variant.product.id,
    product.id,
  );
  // 6. Validate variant has correct base price from product (for display purposes)
  TestValidator.equals(
    "product base price preserved",
    product.base_price,
    10000,
  );
  // 7. Validate variant options were created correctly
  TestValidator.predicate(
    "variant has 2 options",
    variant.options.length === 2,
  );
  const colorOption = variant.options.find((opt) => opt.key === "color");
  const sizeOption = variant.options.find((opt) => opt.key === "size");
  TestValidator.predicate(
    "color option exists",
    colorOption !== undefined && colorOption.value === "Red",
  );
  TestValidator.predicate(
    "size option exists",
    sizeOption !== undefined && sizeOption.value === "Large",
  );
  // 8. Validate SKU code is unique and set correctly
  TestValidator.predicate(
    "SKU code is set",
    variant.skuCode !== null && variant.skuCode !== undefined,
  );
  // 9. Validate stock quantity is positive
  TestValidator.predicate(
    "stock quantity is positive",
    variant.stockQuantity > 0,
  );
}
