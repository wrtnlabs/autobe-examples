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

export async function test_api_product_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and approve seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinResponse = await api.functional.shoppingMall.auth.seller.join(
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
  typia.assert(joinResponse);
  // Create new connection with approved seller credentials
  const approvedSellerConnection: api.IConnection = { host: connection.host };
  const loginResponse = await api.functional.shoppingMall.auth.seller.login(
    approvedSellerConnection,
    {
      body: {
        email: joinResponse.data.profile.shop_name,
        password: joinResponse.data.profile.shop_name,
      } satisfies IShoppingMallSeller.ILogin,
    },
  );
  typia.assert(loginResponse);
  // 2. Create a product to update
  const productCreationResponse =
    await api.functional.shoppingMall.seller.products.create(
      approvedSellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          shopping_mall_category_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          variants: [
            {
              sku_code: RandomGenerator.alphaNumeric(10),
              option_values: [
                {
                  option_name: "color",
                  option_value: RandomGenerator.pick(["red", "blue", "green"]),
                },
              ],
              stock_quantity: 100,
            },
          ] satisfies IShoppingMallProductVariant.ICreate[],
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(productCreationResponse);
  const productId = productCreationResponse.id;
  // 3. Update the product
  const updateResponse =
    await api.functional.shoppingMall.seller.products.update(
      approvedSellerConnection,
      {
        productId,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          shopping_mall_category_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IShoppingMallProduct.IUpdate,
      },
    );
  typia.assert(updateResponse);
  // 4. Validate the updated product
  TestValidator.equals(
    "product name updated",
    updateResponse.name,
    productCreationResponse.name,
  );
  TestValidator.notEquals(
    "product description updated",
    updateResponse.description,
    productCreationResponse.description,
  );
  TestValidator.notEquals(
    "product base price updated",
    updateResponse.base_price,
    productCreationResponse.base_price,
  );
  TestValidator.equals(
    "product has seller",
    updateResponse.seller.id,
    loginResponse.data.profile.id,
  );
  TestValidator.predicate("product is not deleted", !updateResponse.is_deleted);
}
