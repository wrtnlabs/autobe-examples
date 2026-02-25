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
 * Test the complete product variant update workflow where an approved seller
 * modifies both option values and price override.
 *
 * **Test Flow:**
 * 1. Seller creates a product with base price of 50000
 * 2. Seller creates a variant with options {"color": "Red", "size": "Medium"} and price override of 55000
 * 3. Seller updates the variant with new options {"color": "Blue", "size": "Large"} and new price override of 60000
 *
 * **Validations:**
 * - Response status must be 200 OK
 * - Response body must contain the updated variant with new option values
 * - Price override must reflect the new value (60000)
 * - SKU code must remain unchanged (immutable field)
 * - Updated timestamp must be later than creation timestamp
 * - All previous option values must be replaced by the new ones
 */
export async function test_api_product_variant_update_options_and_price(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a product with base price 50000
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: 50000,
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  // 3. Create a variant with initial options and price override
  const originalSkuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const originalPrice = 55000;
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: originalSkuCode,
          price: originalPrice,
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "Medium" },
          ],
        },
      },
    );
  typia.assert(variant);
  const originalCreatedAt = variant.createdAt;
  // 4. Update the variant with new options and price
  const newPrice = 60000;
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          price: newPrice,
          optionValues: {
            color: "Blue",
            size: "Large",
          },
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 5. Validate the update response
  // SKU code must remain unchanged (immutable)
  TestValidator.equals(
    "SKU code unchanged",
    updatedVariant.skuCode,
    originalSkuCode,
  );
  // Price override must reflect new value
  TestValidator.equals(
    "price override updated",
    updatedVariant.price,
    newPrice,
  );
  // Updated timestamp must be later than creation
  TestValidator.predicate(
    "updated_at after created_at",
    new Date(updatedVariant.updatedAt).getTime() >=
      new Date(originalCreatedAt).getTime(),
  );
  // Options must be completely replaced
  TestValidator.equals("options count", updatedVariant.options.length, 2);
  // Verify old options are removed and new ones added
  const colorOption = updatedVariant.options.find((opt) => opt.key === "color");
  const sizeOption = updatedVariant.options.find((opt) => opt.key === "size");
  TestValidator.predicate("color option exists", colorOption !== undefined);
  TestValidator.equals("color value is Blue", colorOption?.value, "Blue");
  TestValidator.predicate("size option exists", sizeOption !== undefined);
  TestValidator.equals("size value is Large", sizeOption?.value, "Large");
  // Verify old values are not present
  const hasOldColor = updatedVariant.options.some(
    (opt) => opt.key === "color" && opt.value === "Red",
  );
  const hasOldSize = updatedVariant.options.some(
    (opt) => opt.key === "size" && opt.value === "Medium",
  );
  TestValidator.predicate("old color 'Red' removed", !hasOldColor);
  TestValidator.predicate("old size 'Medium' removed", !hasOldSize);
}
