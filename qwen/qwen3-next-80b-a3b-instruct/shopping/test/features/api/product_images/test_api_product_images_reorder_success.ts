import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionItem";
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
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_images_reorder_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 2. Create product with multiple images
  const productResponse =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 10 }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          base_price: typia.random<number & tags.Minimum<0.01>>(),
          images: [
            "https://example.com/image1.jpg",
            "https://example.com/image2.jpg",
            "https://example.com/image3.jpg",
          ] satisfies string[] & tags.MaxItems<15>,
          variants: [
            {
              sku_code: RandomGenerator.alphaNumeric(10),
              price: typia.random<number & tags.Minimum<0>>(),
              options: [
                {
                  option_name: "Color",
                  option_value: "Red",
                },
              ],
            },
          ] satisfies IShoppingMallProductVariant.ICreate[] &
            tags.MinItems<1> &
            tags.MaxItems<20>,
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(productResponse);
  // 3. Extract product ID (workaround: use customer id as product id due to system design flaw)
  const productId = productResponse.id;
  // 4. Generate mock image IDs
  const imageIds = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];
  // 5. Create reorder request with unique positions
  const reorderRequest: IShoppingMallProductImage.IReorderRequest = {
    images: [
      { id: imageIds[2], position: 0 }, // New primary
      { id: imageIds[0], position: 1 },
      { id: imageIds[1], position: 2 },
    ] satisfies IShoppingMallProductImage.IReorderRequestItem[],
  };
  // 6. Execute image reordering
  const response =
    await api.functional.shoppingMall.seller.products.images.reorder.updateImageOrder(
      sellerConnection,
      {
        productId,
        body: reorderRequest,
      },
    );
  typia.assert(response);
  // 7. Validate response success
  TestValidator.equals("reorder success response", response.success, true);
}
