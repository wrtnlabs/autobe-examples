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
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

export async function test_api_product_creation_with_invalid_category(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await api.functional.shoppingMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234!@#$",
        shop_name: RandomGenerator.name(),
        shop_description: RandomGenerator.paragraph({ sentences: 3 }),
        logo_image_url: null,
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // 2. Login as the seller to get authenticated connection
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
  };
  const sellerLogin = await api.functional.shoppingMall.auth.seller.login(
    authenticatedSellerConnection,
    {
      body: {
        email: seller.data.profile.shop_name + "@test.com",
        password: "1234!@#$",
      } satisfies IShoppingMallSeller.ILogin,
    },
  );
  typia.assert(sellerLogin);
  // 3. Try to create a product with an invalid category ID
  const invalidCategoryId = "00000000-0000-0000-0000-000000000000"; // UUID format but non-existent
  await TestValidator.error(
    "should reject with invalid category ID",
    async () => {
      await api.functional.shoppingMall.seller.sellers.products.post(
        authenticatedSellerConnection,
        {
          body: {
            name: RandomGenerator.name(),
            description: RandomGenerator.content({
              paragraphs: 2,
              sentenceMin: 5,
              sentenceMax: 10,
            }),
            shopping_mall_category_id: invalidCategoryId,
            base_price: 10000,
            variants: [
              {
                sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
                option_values: [
                  {
                    option_name: "color",
                    option_value: "red",
                  } satisfies IShoppingMallProductVariantOptionValue.ICreate,
                ],
                stock_quantity: 100,
              } satisfies IShoppingMallProductVariant.ICreate,
            ],
          } satisfies IShoppingMallProduct.ICreate,
        },
      );
    },
  );
}
