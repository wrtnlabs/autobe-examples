import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

export async function test_api_product_image_removal_denied_for_unauthorized_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authorized seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinResult = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerJoinResult);
  // 2. Log in as seller to get valid session
  const sellerLoginResult = await authorize_seller_login(sellerConnection, {
    body: typia.random<IShoppingMallSeller.ILogin>(),
  });
  typia.assert(sellerLoginResult);
  // 3. Create a product with images
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  const productWithId = typia.assert<IShoppingMallProduct & { id: string }>(product);
  // 4. Upload an image to the product
  const image =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: productWithId.id },
        body: typia.random<IShoppingMallProductImage.ICreate>(),
      },
    );
  const imageWithId = typia.assert<IShoppingMallProductImage & { id: string }>(image);
  // 5. Create unauthorized customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  // 6. Log in as customer (unauthorized user) - this updates customerConnection headers
  await authorize_customer_login(customerConnection, {
    body: typia.random<IShoppingMallCustomer.ILogin>(),
  });
  // 7. Attempt to delete image as unauthorized user - should return 404
  await TestValidator.httpError(
    "delete image denied for unauthorized user",
    404,
    async () => {
      await api.functional.shoppingMall.seller.products.images.erase(
        customerConnection,
        {
          productId: productWithId.id,
          imageId: imageWithId.id,
        },
      );
    },
  );
}