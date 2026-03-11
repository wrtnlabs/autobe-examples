import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

/**
 * Test that requesting a product image with wrong product context returns 404.
 *
 * Scenario: Two sellers each create a product. Seller B uploads an image to Product B.
 * When attempting to retrieve this image using Product A's productId,
 * the system should return 404 because the image doesn't belong to Product A.
 * This validates that product-image relationship is properly enforced.
 */
export async function test_api_product_image_wrong_product_context(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create Seller A and Product A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {});
  typia.assert(sellerA);
  const productA =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerAConnection,
      {},
    );
  typia.assert(productA);
  // Step 2: Create Seller B and Product B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {});
  typia.assert(sellerB);
  const productB =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerBConnection,
      {},
    );
  typia.assert(productB);
  // Step 3: Seller B uploads an image to Product B
  const imageB =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerBConnection,
      {
        params: { productId: productB.id },
      },
    );
  typia.assert(imageB);
  // Step 4: Attempt to retrieve image using Product A's productId (wrong context)
  // This should fail with 404 because image doesn't belong to Product A
  const publicConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "image not found for wrong product context",
    404,
    async () =>
      await api.functional.shoppingMall.products.images.at(publicConnection, {
        productId: productA.id,
        imageId: imageB.id,
      }),
  );
}
