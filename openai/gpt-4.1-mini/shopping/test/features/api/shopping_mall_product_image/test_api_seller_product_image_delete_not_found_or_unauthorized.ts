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

export async function test_api_seller_product_image_delete_not_found_or_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Attempt to delete a product image that does not exist or does not belong to the specified product.
  // Prerequisites: Seller joins platform, creates product, uploads image, then attempts to delete an imageId that does not exist or belongs to a different product.
  // Verify the operation returns appropriate HTTP error such as 404 Not Found or 403 Forbidden to prevent unauthorized deletion.
  // This ensures data integrity and ownership enforcement.
  // 1. Seller joins platform
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerJoinConnection, {
    body: {},
  });
  typia.assert(sellerAuthorized);
  // Prepare seller authorized connection
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuthorized.token.access}`,
  };
  // 2. Seller creates a product
  const productAResult =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      { body: {} },
    );
  // Extract productA id as string
  const productAId: string =
    (productAResult as any).id ?? typia.random<string & tags.Format<"uuid">>();
  // 3. Seller uploads an image for productA
  const imageAResult =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      { params: { productId: productAId }, body: {} },
    );
  const imageAId: string =
    (imageAResult as any).id ?? typia.random<string & tags.Format<"uuid">>();
  // 4. Seller creates another product
  const productBResult =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      { body: {} },
    );
  const productBId: string =
    (productBResult as any).id ?? typia.random<string & tags.Format<"uuid">>();
  // 5. Seller uploads an image for productB
  const imageBResult =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      { params: { productId: productBId }, body: {} },
    );
  const imageBId: string =
    (imageBResult as any).id ?? typia.random<string & tags.Format<"uuid">>();
  // 6. Attempt to delete an image with an imageId that does not exist (random UUID)
  const randomNonExistentImageId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "delete non-existent image should fail with 404 or 403",
    [404, 403],
    async () => {
      await api.functional.shoppingMall.seller.products.images.eraseImage(
        sellerConnection,
        {
          productId: productAId,
          imageId: randomNonExistentImageId,
        },
      );
    },
  );
  // 7. Attempt to delete an image that belongs to a different product
  await TestValidator.httpError(
    "delete image that belongs to a different product should fail with 404 or 403",
    [404, 403],
    async () => {
      await api.functional.shoppingMall.seller.products.images.eraseImage(
        sellerConnection,
        {
          productId: productAId,
          imageId: imageBId,
        },
      );
    },
  );
}
