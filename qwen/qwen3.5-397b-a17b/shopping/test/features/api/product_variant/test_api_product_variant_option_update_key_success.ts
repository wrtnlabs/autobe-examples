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
import { generate_random_shopping_mall_seller_products_variants_options_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_options_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

export async function test_api_product_variant_option_update_key_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication - create seller account
  const sellerAuth = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create seller-specific connection for product operations
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 3. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Create a variant with an initial option (key: "color", value: "Red")
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: typia.random<string>(),
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
  typia.assert(variant);
  // Verify variant has the option created
  TestValidator.predicate("variant has options", variant.options.length > 0);
  const originalOption = variant.options[0];
  TestValidator.equals("original option key", originalOption.key, "color");
  TestValidator.equals("original option value", originalOption.value, "Red");
  // 5. Update the option key from "color" to "shade" (no conflict since only one option exists)
  const updatedOption =
    await api.functional.shoppingMall.seller.products.variants.options.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        optionId: originalOption.id,
        body: {
          key: "shade",
        } satisfies IShoppingMallProductVariantOption.IUpdate,
      },
    );
  typia.assert(updatedOption);
  // 6. Validate the update results
  TestValidator.equals("updated option key", updatedOption.key, "shade");
  TestValidator.equals("option value preserved", updatedOption.value, "Red");
  TestValidator.equals(
    "option id unchanged",
    updatedOption.id,
    originalOption.id,
  );
  // 7. Verify updated_at timestamp changed (should be later than original)
  const originalUpdatedAt = new Date(originalOption.updated_at).getTime();
  const updatedUpdatedAt = new Date(updatedOption.updated_at).getTime();
  TestValidator.predicate(
    "updated_at timestamp changed",
    updatedUpdatedAt > originalUpdatedAt,
  );
}
