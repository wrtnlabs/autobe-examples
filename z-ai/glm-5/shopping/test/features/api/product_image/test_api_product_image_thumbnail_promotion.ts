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
 * Test scenario for a seller promoting a different image to become the main thumbnail
 * by setting it to the lowest display_order.
 *
 * Workflow:
 * 1. Seller authenticates via join
 * 2. Seller creates a product
 * 3. Seller creates first image with display_order=0 (main thumbnail)
 * 4. Seller creates second image with display_order=10 (not main thumbnail)
 * 5. Seller updates second image to display_order=-1 (now becomes main thumbnail)
 * 6. Validate the display_order update is successful
 */
export async function test_api_product_image_thumbnail_promotion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
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
  // 3. Create first image with display_order=0 (will be main thumbnail)
  const firstImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { displayOrder: 0 },
      },
    );
  typia.assert(firstImage);
  // 4. Create second image with display_order=10 (higher, not main thumbnail initially)
  const secondImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { displayOrder: 10 },
      },
    );
  typia.assert(secondImage);
  // Verify initial state - first image has lower display_order
  TestValidator.predicate(
    "first image has lower display_order initially",
    firstImage.displayOrder < secondImage.displayOrder,
  );
  // 5. Update second image to have lower display_order than first image
  // This will promote it to become the new main thumbnail
  const newDisplayOrder = -1;
  const updatedImage =
    await api.functional.shoppingMall.seller.products.images.update(
      sellerConnection,
      {
        productId: product.id,
        imageId: secondImage.id,
        body: {
          display_order: newDisplayOrder,
        } satisfies IShoppingMallProductImage.IUpdate,
      },
    );
  typia.assert(updatedImage);
  // 6. Validate the update was successful
  TestValidator.equals(
    "updated display_order",
    updatedImage.displayOrder,
    newDisplayOrder,
  );
  // Verify that the updated image now has the lowest display_order
  TestValidator.equals(
    "updated image ID matches",
    updatedImage.id,
    secondImage.id,
  );
  TestValidator.predicate(
    "updated image now has lower display_order than first image",
    updatedImage.displayOrder < firstImage.displayOrder,
  );
}
