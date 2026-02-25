import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_shopping_mall_seller_sellers_products_patch } from "../../../generate/generate_random_shopping_mall_seller_sellers_products_patch";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

export async function test_api_product_creation_with_variant(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url:
      Math.random() > 0.5 ? null : typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: sellerJoinData,
    });
  typia.assert(sellerAuthorized);
  // Step 2: Get a category for product
  // For this test, we'll use a simple hardcoded category ID from the system
  const categoryId = "00000000-0000-0000-0000-000000000001";
  // Step 3: Create product with variant
  const productCreateData = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    shopping_mall_category_id: categoryId,
    base_price: typia.random<
      number & tags.MultipleOf<0.01>
    >() satisfies number as number & tags.MultipleOf<0.01>,
    images: [
      {
        image_url: typia.random<string & tags.Format<"uri">>(),
        sort_order: 0,
      } satisfies IShoppingMallProductImage.ICreate,
    ],
    variants: [
      {
        sku_code: `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
        option_values: [
          {
            option_name: "color",
            option_value: RandomGenerator.pick([
              "red",
              "blue",
              "green",
              "black",
            ] as const),
          } satisfies IShoppingMallProductVariantOptionValue.ICreate,
          {
            option_name: "size",
            option_value: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
          } satisfies IShoppingMallProductVariantOptionValue.ICreate,
        ],
        price_override: null,
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >() satisfies number as number & tags.Type<"int32"> & tags.Minimum<0>,
      } satisfies IShoppingMallProductVariant.ICreate,
    ],
  } satisfies IShoppingMallProduct.ICreate;
  // Step 4: Create the product
  await api.functional.shoppingMall.seller.sellers.products.patch(
    sellerConnection,
    {
      body: productCreateData,
    },
  );
}
