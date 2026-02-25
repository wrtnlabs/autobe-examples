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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

export async function test_api_seller_product_update_invalid_category(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerData: IShoppingMallSeller.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url: null,
  };
  const sellerResponse = await authorize_seller_join(sellerConnection, {
    body: sellerData,
  });
  typia.assert(sellerResponse);
  // 2. Create a new product with valid category
  const createResponse =
    await api.functional.shoppingMall.seller.products.create(sellerConnection, {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 5,
          sentenceMax: 15,
        }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        shopping_mall_category_id: sellerResponse.data.profile.id,
        variants: [
          {
            sku_code: RandomGenerator.alphaNumeric(8),
            option_values: [
              {
                option_name: "size",
                option_value: "M",
              },
            ],
            price_override: null,
            stock_quantity: 100,
          },
        ],
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(createResponse);
  const productId = createResponse.id;
  // 3. Attempt to update product with invalid category ID
  const invalidCategoryId = "00000000-0000-0000-0000-000000000000";
  await TestValidator.error("invalid category reference", async () => {
    await api.functional.shoppingMall.seller.sellers.products.update(
      sellerConnection,
      {
        productId,
        body: {
          shopping_mall_category_id: invalidCategoryId,
        } satisfies IShoppingMallProduct.IUpdate,
      },
    );
  });
}
