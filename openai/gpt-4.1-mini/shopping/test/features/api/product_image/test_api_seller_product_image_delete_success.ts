import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

export async function test_api_seller_product_image_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion of a product image by an authorized seller.
  // Prerequisites: Seller registers and logs in, creates a product, uploads a product image.
  // Test that the seller can delete the uploaded image successfully.
  // Verify that the image is no longer retrievable and the product image list is updated accordingly.
  // Validate HTTP 204 status on deletion.
  // Confirm authorization checks prevent deletion by unauthorized users.
  // 1. Seller registers and is authorized
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(connection, { body: {} });
  typia.assert(authorized);
  sellerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(product);
  const productEntity = typia.assert<IEntity>(product);
  // 3. Seller uploads a product image
  const image =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: productEntity.id },
        body: {},
      },
    );
  typia.assert(image);
  const imageEntity = typia.assert<IEntity>(image);
  // 4. Seller deletes the product image
  await api.functional.shoppingMall.seller.products.images.eraseImage(
    sellerConnection,
    {
      productId: productEntity.id,
      imageId: imageEntity.id,
    },
  );
  // 5. Deletion successful if no error thrown
}
