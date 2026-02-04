import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_product_image_upload_unauthorized_product(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a connection and authenticate as first seller
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1: IShoppingMallSeller.IAuthorized = await authorize_seller_join(
    seller1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(seller1);
  // Step 2: Create a product as first seller
  const product: IShoppingMallProduct =
    await generate_random_shopping_mall_seller_products_create(
      seller1Connection,
      {},
    );
  typia.assert(product);
  // Step 3: Create a connection and authenticate as second seller
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2: IShoppingMallSeller.IAuthorized = await authorize_seller_join(
    seller2Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(seller2);
  // Step 4: Attempt to upload images to product owned by seller1 (unauthorized)
  // Create valid image data but with seller2's unauthorized connection
  // Note: The API expects a SINGLE IShoppingMallProductImage.ICreate object, not an array
  const image: IShoppingMallProductImage.ICreate = {
    name: RandomGenerator.name(),
    extension: "jpg",
    url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallProductImage.ICreate;
  // Generate a random productId (this likely doesn't exist)
  const randomProductId = typia.random<string & tags.Format<"uuid">>();
  // This should fail with 403 Forbidden since seller2 doesn't own the product
  // or productId doesn't exist (which will also cause 403)
  await TestValidator.httpError(
    "seller should not be able to upload images to unauthorized/invalid product",
    403, // Expected status code for unauthorized access or non-existent product
    async () => {
      await api.functional.shoppingMall.seller.products.images.create(
        seller2Connection, // Using seller2's connection to upload
        {
          productId: randomProductId, // Using random productId (doesn't exist)
          body: image,
        },
      );
    },
  );
}
