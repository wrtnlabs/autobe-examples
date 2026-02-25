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

export async function test_api_seller_product_update_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: First seller registers and creates a product
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Authorized = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: `Shop_${RandomGenerator.name()}`,
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller1Authorized);
  // Create product connection with token from seller1 registration
  const seller1ProductConnection: api.IConnection = {
    host: connection.host,
    headers: {
      authorization: seller1Authorized.token.access,
    },
  };
  const product = await api.functional.shoppingMall.seller.products.create(
    seller1ProductConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        shopping_mall_category_id: "c9a7b8f6-e5d4-43c2-b1a0-9f8e7d6c5b4a",
        base_price: 10000,
        images: [
          {
            image_url: "https://example.com/image1.jpg",
            sort_order: 0,
          } satisfies IShoppingMallProductImage.ICreate,
        ],
        variants: [
          {
            sku_code: `SKU_${RandomGenerator.alphaNumeric(8)}`,
            option_values: [
              {
                option_name: "size",
                option_value: "M",
              } satisfies IShoppingMallProductVariantOptionValue.ICreate,
            ],
            stock_quantity: 100,
          } satisfies IShoppingMallProductVariant.ICreate,
        ],
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Step 2: Second seller registers and logs in
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Authorized = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: `Another_Shop_${RandomGenerator.name()}`,
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller2Authorized);
  const seller2ProductConnection: api.IConnection = {
    host: connection.host,
    headers: {
      authorization: seller2Authorized.token.access,
    },
  };
  // Step 3: Second seller attempts to update first seller's product (unauthorized)
  const updateBody: IShoppingMallProduct.IUpdate = {
    name: "Updated Name by Unauthorized Seller",
  };
  await TestValidator.error(
    "unauthorized seller cannot update other seller's product",
    async () => {
      await api.functional.shoppingMall.seller.sellers.products.update(
        seller2ProductConnection,
        {
          productId: product.id,
          body: updateBody,
        },
      );
    },
  );
}
