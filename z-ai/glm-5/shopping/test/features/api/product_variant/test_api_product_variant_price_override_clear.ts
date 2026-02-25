import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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
 * Test clearing a variant's price override to null.
 *
 * Tests the business rule: when a variant's price is set to null,
 * the variant should inherit the parent product's base price.
 *
 * **Test Flow:**
 * 1. Seller joins and gets approved
 * 2. Seller creates a product with base price of 50000
 * 3. Seller creates a variant with price override of 45000
 * 4. Seller updates the variant with price set to null
 *
 * **Validations:**
 * - Response body shows price field as null
 * - Updated timestamp is modified
 * - The variant signals it will use product's base_price (50000)
 */
export async function test_api_product_variant_price_override_clear(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Create product with base price of 50000
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        base_price: 50000,
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  // 3. Create variant with price override of 45000
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8),
          price: 45000,
          optionValues: [
            {
              key: "color",
              value: RandomGenerator.pick(["Red", "Blue", "Green"] as const),
            },
          ],
        },
      },
    );
  typia.assert(variant);
  // Validate initial variant has price override
  TestValidator.equals("initial price override", variant.price, 45000);
  const originalUpdatedAt = variant.updatedAt;
  // 4. Update variant with price set to null (clear price override)
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          price: null,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 5. Validations
  // Price should be null, signaling inheritance from product's base_price
  TestValidator.equals("price is null", updatedVariant.price, null);
  // Updated timestamp should be modified
  TestValidator.notEquals(
    "updated timestamp changed",
    updatedVariant.updatedAt,
    originalUpdatedAt,
  );
  // Product reference should still be available for base_price lookup
  TestValidator.equals(
    "product reference preserved",
    updatedVariant.product.id,
    product.id,
  );
  // Verify the variant id is preserved
  TestValidator.equals("variant id preserved", updatedVariant.id, variant.id);
  // Verify SKU code is preserved (immutable)
  TestValidator.equals(
    "sku code preserved",
    updatedVariant.skuCode,
    variant.skuCode,
  );
}