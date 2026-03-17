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
 * Test automatic thumbnail update when deleting the main thumbnail image.
 *
 * Steps:
 * 1. Create an approved seller account
 * 2. Create a product
 * 3. Upload first image with display_order = 1 (main thumbnail, target for deletion)
 * 4. Upload second image with display_order = 2 (will become new thumbnail after first is deleted)
 * 5. Delete the first image (main thumbnail)
 * 6. Verify deletion completes successfully
 *
 * Note: Verification of automatic reordering (displayOrder 2 -> 1) and thumbnail
 * update requires a GET endpoint for products/images which is not available in
 * the current API set. The business logic should handle this automatically.
 */
export async function test_api_product_image_thumbnail_update_on_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // Step 2: Create product
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      { body: {} },
    );
  typia.assert(product);
  // Step 3: Upload first image with display_order = 1 (main thumbnail)
  const firstImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { displayOrder: 1 },
      },
    );
  typia.assert(firstImage);
  TestValidator.equals("first image display order", firstImage.displayOrder, 1);
  // Step 4: Upload second image with display_order = 2
  const secondImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { displayOrder: 2 },
      },
    );
  typia.assert(secondImage);
  TestValidator.equals(
    "second image display order",
    secondImage.displayOrder,
    2,
  );
  // Step 5: Delete the first image (main thumbnail)
  // This should return 204 No Content (void) on success
  await api.functional.shoppingMall.seller.products.images.erase(
    sellerConnection,
    {
      productId: product.id,
      imageId: firstImage.id,
    },
  );
  // The deletion completed successfully (no error thrown)
  // Business logic should have:
  // 1. Deleted the first image
  // 2. Reordered remaining images: second image now has displayOrder = 1
  // 3. Second image becomes the new main thumbnail
}
