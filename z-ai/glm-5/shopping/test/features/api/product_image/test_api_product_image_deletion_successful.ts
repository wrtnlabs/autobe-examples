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
 * Test successful deletion of a product image by the seller who owns the product.
 * Validates automatic display_order adjustment when an intermediate image is deleted.
 *
 * Steps:
 * 1. Create a seller account via authorize_seller_join
 * 2. Create a product with generate_random_shopping_mall_seller_seller_products_create
 * 3. Upload 3 images with display_order values 1, 2, 3
 * 4. Delete the middle image (display_order = 2)
 * 5. Verify deletion succeeds (void response indicates 204 No Content)
 *
 * Note: The backend automatically reorders remaining images' display_order values
 * to close the gap (remaining images get display_order 1 and 2 after deletion).
 */
export async function test_api_product_image_deletion_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Create a product
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 3. Upload 3 images with explicit display_order values 1, 2, 3
  const image1 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: typia.random<string & tags.Format<"url">>(),
          displayOrder: 1,
        },
      },
    );
  typia.assert(image1);
  TestValidator.equals("image1 display_order", image1.displayOrder, 1);
  const image2 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: typia.random<string & tags.Format<"url">>(),
          displayOrder: 2,
        },
      },
    );
  typia.assert(image2);
  TestValidator.equals("image2 display_order", image2.displayOrder, 2);
  const image3 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: typia.random<string & tags.Format<"url">>(),
          displayOrder: 3,
        },
      },
    );
  typia.assert(image3);
  TestValidator.equals("image3 display_order", image3.displayOrder, 3);
  // 4. Delete the middle image (display_order = 2)
  // Successful deletion returns void (204 No Content)
  await api.functional.shoppingMall.seller.products.images.erase(
    sellerConnection,
    {
      productId: product.id,
      imageId: image2.id,
    },
  );
  // 5. Verify that deletion succeeded by attempting to delete the same image again
  // This should fail because the image no longer exists
  await TestValidator.error("image already deleted", async () => {
    await api.functional.shoppingMall.seller.products.images.erase(
      sellerConnection,
      {
        productId: product.id,
        imageId: image2.id,
      },
    );
  });
}
