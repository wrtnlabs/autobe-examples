import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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

/**
 * Test that a seller cannot retrieve images from another seller's product (authorization boundary).
 *
 * Validates the authorization boundary for product image access between different sellers. Ensures that sellers can only access images for products they own, preventing unauthorized cross-seller data access.
 *
 * Special attention is given to verifying that the API properly rejects attempts to access another seller's product images, returning appropriate HTTP error status codes.
 *
 * 1. Register and authenticate as seller A.
 * 2. Seller A creates their own product (setup validation).
 * 3. Register and authenticate as seller B (different seller account).
 * 4. Seller B creates a product and uploads an image to it.
 * 5. While authenticated as seller A, attempt to retrieve seller B's product image.
 * 6. Verify the request fails with HTTP error (403 Forbidden or 404 Not Found).
 */
export async function test_api_product_image_retrieve_another_seller_product_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {},
  });
  typia.assert(sellerA);
  // 2. Seller A creates their own product (setup validation, not used in test)
  const productA = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {},
  );
  typia.assert(productA);
  // 3. Register and authenticate as seller B (different seller account)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {},
  });
  typia.assert(sellerB);
  // 4. Seller B creates a product
  const productB = await generate_random_shopping_mall_seller_products_create(
    sellerBConnection,
    {},
  );
  typia.assert(productB);
  // 5. Seller B uploads an image to their product
  const imageB =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerBConnection,
      {
        params: { productId: productB.id },
        body: {},
      },
    );
  typia.assert(imageB);
  // 6. While authenticated as seller A, attempt to retrieve seller B's product image
  // This should fail because seller A does not own productB
  await TestValidator.httpError(
    "seller A cannot access seller B's product image",
    [403, 404],
    async () =>
      await api.functional.shoppingMall.seller.products.images.at(
        sellerAConnection,
        {
          productId: productB.id,
          imageId: imageB.id,
        },
      ),
  );
}
