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

export async function test_api_product_variant_option_update_existing_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product with required shopping_category_id
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Create a variant with initial options (color=Red, size=Large)
  const initialOptions: IShoppingMallProductVariantOption.ICreate[] = [
    { key: "color", value: "Red" },
    { key: "size", value: "Large" },
  ];
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
          options: initialOptions,
        },
      },
    );
  typia.assert(variant);
  // Store initial state for comparison
  const initialUpdatedAt = variant.updatedAt;
  const initialVariantId = variant.id;
  const initialOptionsCount = variant.options.length;
  // Verify initial options are set correctly
  const initialColorOption = variant.options.find((opt) => opt.key === "color");
  TestValidator.equals(
    "initial color option value should be Red",
    initialColorOption?.value,
    "Red",
  );
  const initialSizeOption = variant.options.find((opt) => opt.key === "size");
  TestValidator.equals(
    "initial size option value should be Large",
    initialSizeOption?.value,
    "Large",
  );
  // 4. Update variant option (color=Red to color=Blue)
  // Note: The endpoint updates a single option key-value pair at a time
  const updatedVariant =
    await api.functional.shoppingMall.products.variants.options.updateOptions(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          key: "color",
          value: "Blue",
        },
      },
    );
  typia.assert(updatedVariant);
  // 5. Validate the update
  // Verify variant ID remains the same
  TestValidator.equals(
    "variant ID should remain unchanged after update",
    updatedVariant.id,
    initialVariantId,
  );
  // Verify updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at timestamp should change after option update",
    initialUpdatedAt,
    updatedVariant.updatedAt,
  );
  // Verify the color option was updated to Blue
  const updatedColorOption = updatedVariant.options.find(
    (opt) => opt.key === "color",
  );
  TestValidator.predicate(
    "color option should exist after update",
    updatedColorOption !== undefined,
  );
  TestValidator.equals(
    "color option value should be updated to Blue",
    updatedColorOption!.value,
    "Blue",
  );
  // Verify size option still exists with original value (unchanged)
  const updatedSizeOption = updatedVariant.options.find(
    (opt) => opt.key === "size",
  );
  TestValidator.predicate(
    "size option should still exist after update",
    updatedSizeOption !== undefined,
  );
  TestValidator.equals(
    "size option value should remain Large (unchanged)",
    updatedSizeOption!.value,
    "Large",
  );
  // Verify options count remains the same (no options added or removed)
  TestValidator.equals(
    "options count should remain same after update",
    updatedVariant.options.length,
    initialOptionsCount,
  );
  // Verify variant belongs to correct product
  TestValidator.equals(
    "variant product id should match original product",
    updatedVariant.product.id,
    product.id,
  );
  // Verify product name is preserved
  TestValidator.equals(
    "variant product name should match original product",
    updatedVariant.product.name,
    product.name,
  );
}
