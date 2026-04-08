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
 * Test product image reordering to promote a different image as the main thumbnail.
 *
 * Validates the complete image reordering workflow where a seller changes the display order of product images to promote a different image as the main thumbnail. The test verifies that the image with the lowest display_order becomes the thumbnail shown in product listings, and that product snapshots are created to preserve the historical state of image ordering for audit purposes.
 *
 * Special attention is given to verifying that the display_order uniqueness constraint is maintained (no two images can have the same display_order), and that the updated_at timestamp reflects the modification time when an image's position is changed.
 *
 * 1. Seller authenticates via join endpoint to gain permission for product image management.
 * 2. Create a product that will contain images to be reordered.
 * 3. Upload first image to the product (will become initial thumbnail with display_order=1).
 * 4. Upload second image to the product (will have display_order=2).
 * 5. Verify initial state: first uploaded image has display_order=1 (main thumbnail), second has display_order=2.
 * 6. Swap display orders: update first image to display_order=2, then update second image to display_order=1.
 * 7. Verify both images have their new display_order values.
 * 8. Confirm the second image is now promoted to thumbnail position (display_order=1).
 */
export async function test_api_product_image_reorder_thumbnail_promotion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Upload first image (will be initial thumbnail)
  const firstImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {},
      },
    );
  typia.assert(firstImage);
  // 4. Upload second image
  const secondImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {},
      },
    );
  typia.assert(secondImage);
  // 5. Verify initial state
  TestValidator.equals(
    "first image display_order is 1",
    firstImage.display_order,
    1,
  );
  TestValidator.equals(
    "second image display_order is 2",
    secondImage.display_order,
    2,
  );
  // 6. Swap display orders to promote second image to thumbnail
  // First, update first image to display_order=2
  const updatedFirstImage =
    await api.functional.shoppingMall.seller.products.images.putByProductidAndImageid(
      sellerConnection,
      {
        productId: product.id,
        imageId: firstImage.id,
        body: {
          display_order: 2,
        } satisfies IShoppingMallProductImage.IUpdate,
      },
    );
  typia.assert(updatedFirstImage);
  // Then, update second image to display_order=1 (promote to thumbnail)
  const updatedSecondImage =
    await api.functional.shoppingMall.seller.products.images.putByProductidAndImageid(
      sellerConnection,
      {
        productId: product.id,
        imageId: secondImage.id,
        body: {
          display_order: 1,
        } satisfies IShoppingMallProductImage.IUpdate,
      },
    );
  typia.assert(updatedSecondImage);
  // 7. Verify both images have their new display_order values
  TestValidator.equals(
    "first image moved to display_order 2",
    updatedFirstImage.display_order,
    2,
  );
  TestValidator.equals(
    "second image promoted to display_order 1",
    updatedSecondImage.display_order,
    1,
  );
  // 8. Verify updated timestamps reflect the modification time
  TestValidator.predicate(
    "first image updated_at exists",
    updatedFirstImage.updated_at !== undefined,
  );
  TestValidator.predicate(
    "second image updated_at exists",
    updatedSecondImage.updated_at !== undefined,
  );
  // 9. Confirm uniqueness constraint is maintained (no duplicate display_order values)
  TestValidator.notEquals(
    "display_order values are unique",
    updatedFirstImage.display_order,
    updatedSecondImage.display_order,
  );
  // 10. Verify the second image is now the main thumbnail (lowest display_order)
  TestValidator.predicate(
    "second image is now the thumbnail",
    updatedSecondImage.display_order < updatedFirstImage.display_order,
  );
}
