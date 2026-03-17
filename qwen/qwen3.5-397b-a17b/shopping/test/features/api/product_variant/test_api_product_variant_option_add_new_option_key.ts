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
 * Test that a seller can add new option keys to an existing variant.
 * The seller creates a product with a variant having only color=Red option,
 * then adds a new option key size=Large to the same variant.
 * Verify the variant returns with both options (color and size),
 * the new option is properly associated with the variant,
 * and the variant's updated_at timestamp changes indicating modification occurred.
 * This validates the ability to extend variant characteristics after initial creation.
 */
export async function test_api_product_variant_option_add_new_option_key(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Create variant with only color option
  const initialVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: RandomGenerator.alphaNumeric(10),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          options: [
            {
              key: "color",
              value: "Red",
            } satisfies IShoppingMallProductVariantOption.ICreate,
          ],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(initialVariant);
  TestValidator.equals(
    "initial options count",
    initialVariant.options.length,
    1,
  );
  TestValidator.equals(
    "initial color option",
    initialVariant.options[0].key,
    "color",
  );
  TestValidator.equals(
    "initial color value",
    initialVariant.options[0].value,
    "Red",
  );
  // 4. Add new option key (size) to the variant
  const updatedVariant =
    await api.functional.shoppingMall.products.variants.options.updateOptions(
      sellerConnection,
      {
        productId: product.id,
        variantId: initialVariant.id,
        body: {
          key: "size",
          value: "Large",
        } satisfies IShoppingMallProductVariantOption.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 5. Validate the variant now has both options
  TestValidator.predicate("has 2 options", updatedVariant.options.length === 2);
  const colorOption = updatedVariant.options.find((opt) => opt.key === "color");
  const sizeOption = updatedVariant.options.find((opt) => opt.key === "size");
  TestValidator.predicate("color option exists", colorOption !== undefined);
  TestValidator.predicate("size option exists", sizeOption !== undefined);
  TestValidator.equals("color value preserved", colorOption!.value, "Red");
  TestValidator.equals("size value correct", sizeOption!.value, "Large");
  // 6. Validate timestamp changed (variant was modified)
  TestValidator.predicate(
    "updated_at changed",
    updatedVariant.updatedAt > initialVariant.updatedAt,
  );
}
