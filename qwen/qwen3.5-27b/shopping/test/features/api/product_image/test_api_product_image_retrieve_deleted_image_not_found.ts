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
 * Test that attempting to retrieve a non-existent or deleted product image returns 404 Not Found.
 *
 * Validates that the product image retrieval endpoint properly handles requests for images that don't exist or have been deleted. The test creates a seller account, creates a product, and then attempts to retrieve an image that was never created to verify it returns a 404 Not Found error.
 *
 * Special attention is given to verifying that the retrieval endpoint correctly returns appropriate error responses when the requested image cannot be found, ensuring proper error handling and preventing access to non-existent resources.
 *
 * 1. Register and authenticate as a seller with randomized credentials.
 * 2. Create a product with name, description, and base price.
 * 3. Generate a random UUID that represents a non-existent image ID.
 * 4. Attempt to retrieve the non-existent image by product ID and invalid image ID.
 * 5. Verify that the retrieval returns 404 Not Found status.
 */
export async function test_api_product_image_retrieve_deleted_image_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Generate a random UUID for a non-existent image
  const nonExistentImageId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Attempt to retrieve the non-existent image
  await TestValidator.httpError(
    "non-existent image returns 404 Not Found",
    404,
    async () =>
      await api.functional.shoppingMall.seller.products.images.at(
        sellerConnection,
        {
          productId: product.id,
          imageId: nonExistentImageId,
        },
      ),
  );
}
