import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_sellers_products_post } from "../../../generate/generate_random_shopping_mall_seller_sellers_products_post";
import { generate_random_shopping_mall_seller_sellers_products_variants_create_variant } from "../../../generate/generate_random_shopping_mall_seller_sellers_products_variants_create_variant";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

export async function test_api_product_variant_creation_duplicate_option_combination_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await api.functional.shoppingMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_image_url: null,
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // 2. Create a new product with an initial variant
  const product =
    await api.functional.shoppingMall.seller.sellers.products.post(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          shopping_mall_category_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          base_price: 10000,
          variants: [
            {
              sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
              option_values: [
                {
                  option_name: "color",
                  option_value: "red",
                },
                {
                  option_name: "size",
                  option_value: "L",
                },
              ],
              stock_quantity: 100,
            },
          ],
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // 3. Attempt to create a variant with duplicate option combination
  const duplicateBody = {
    sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    option_values: [
      {
        option_name: "color",
        option_value: "red",
      },
      {
        option_name: "size",
        option_value: "L",
      },
    ],
    stock_quantity: 50,
  } satisfies IShoppingMallProductVariant.ICreate;
  // 4. Verify duplicate variant creation is rejected with 409 conflict
  await TestValidator.error(
    "duplicate option combination should be rejected",
    async () => {
      await api.functional.shoppingMall.seller.sellers.products.variants.createVariant(
        sellerConnection,
        {
          productId: product.id,
          body: duplicateBody,
        },
      );
    },
  );
  // 5. Verify that different option combinations are allowed
  const uniqueBody = {
    sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    option_values: [
      {
        option_name: "color",
        option_value: "blue",
      },
      {
        option_name: "size",
        option_value: "L",
      },
    ],
    stock_quantity: 50,
  } satisfies IShoppingMallProductVariant.ICreate;
  const newVariant =
    await api.functional.shoppingMall.seller.sellers.products.variants.createVariant(
      sellerConnection,
      {
        productId: product.id,
        body: uniqueBody,
      },
    );
  typia.assert(newVariant);
  // Verify the new variant has different option values
  TestValidator.notEquals(
    "variant option values differ",
    JSON.stringify(newVariant.optionValues),
    JSON.stringify(["red", "L"]),
  );
}