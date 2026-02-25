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
 * Test updating only the option values of a variant while keeping the price override unchanged.
 *
 * This test verifies:
 * 1. Complete replacement of option values (not merge or append)
 * 2. Old option keys are removed when new options are provided
 * 3. Omitting the price field in update request preserves the existing price override value
 * 4. SKU code remains unchanged after update
 */
export async function test_api_product_variant_options_replacement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a product with base price of 75000
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        base_price: 75000,
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  // 3. Create a variant with options {"color": "Black", "material": "Cotton"} and no price override (null)
  const originalSkuCode = RandomGenerator.alphaNumeric(12);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: originalSkuCode,
          price: null,
          optionValues: [
            { key: "color", value: "Black" },
            { key: "material", value: "Cotton" },
          ],
        },
      },
    );
  typia.assert(variant);
  // Verify initial variant state
  TestValidator.equals("initial variant has null price", variant.price, null);
  TestValidator.equals(
    "initial variant has correct SKU",
    variant.skuCode,
    originalSkuCode,
  );
  TestValidator.equals(
    "initial variant has 2 options",
    variant.options.length,
    2,
  );
  TestValidator.predicate(
    "initial variant has color option",
    variant.options.some((opt) => opt.key === "color" && opt.value === "Black"),
  );
  TestValidator.predicate(
    "initial variant has material option",
    variant.options.some(
      (opt) => opt.key === "material" && opt.value === "Cotton",
    ),
  );
  // 4. Update the variant with completely different options and omit the price field
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          optionValues: {
            size: "XL",
            pattern: "Striped",
          },
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 5. Validate the update results
  // Price override must remain null (inheriting product's base price)
  TestValidator.equals(
    "price remains null after update",
    updatedVariant.price,
    null,
  );
  // SKU code must remain unchanged
  TestValidator.equals(
    "SKU code unchanged",
    updatedVariant.skuCode,
    originalSkuCode,
  );
  // Options array must contain exactly 2 items with the new key-value pairs
  TestValidator.equals(
    "updated variant has 2 options",
    updatedVariant.options.length,
    2,
  );
  // Verify new options exist
  TestValidator.predicate(
    "updated variant has size option",
    updatedVariant.options.some(
      (opt) => opt.key === "size" && opt.value === "XL",
    ),
  );
  TestValidator.predicate(
    "updated variant has pattern option",
    updatedVariant.options.some(
      (opt) => opt.key === "pattern" && opt.value === "Striped",
    ),
  );
  // Old option keys (color, material) must be completely replaced, not merged
  TestValidator.predicate(
    "old 'color' option removed",
    !updatedVariant.options.some((opt) => opt.key === "color"),
  );
  TestValidator.predicate(
    "old 'material' option removed",
    !updatedVariant.options.some((opt) => opt.key === "material"),
  );
}
