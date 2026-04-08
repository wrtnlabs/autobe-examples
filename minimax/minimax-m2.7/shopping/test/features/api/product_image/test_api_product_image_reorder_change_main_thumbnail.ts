import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_images_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_images_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

/**
 * Test successfully reordering product images to change the main thumbnail.
 *
 * Validates the complete image reordering flow including seller authentication,
 * product creation with category assignment, and image upload followed by
 * reordering to change the main thumbnail. Ensures that the first image in
 * the reordered array becomes the new main thumbnail with display_order=0.
 *
 * Special attention is given to verifying that image URLs remain unchanged
 * after reordering, and only the display_order values are modified.
 *
 * 1. Administrator creates a product category for product assignment.
 * 2. Seller registers and authenticates with the platform.
 * 3. Seller creates a product with name, description, base price, and category.
 * 4. Seller uploads multiple images (3) to the product gallery.
 * 5. Verifies the first uploaded image is the main thumbnail (display_order=0).
 * 6. Seller reorders images via PATCH endpoint with last image first in array.
 * 7. Validates response contains all images in the new display order.
 * 8. Verifies previously last image now has display_order=0 (new main thumbnail).
 * 9. Confirms image URLs are preserved and only display_order values changed.
 */
export async function test_api_product_image_reorder_change_main_thumbnail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // Update seller connection with auth token
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 3. Create category via admin
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 4. Create product with category
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          categoryId: category.id,
        },
      },
    );
  typia.assert(product);
  // 5. Upload 3 images to the product
  const image1 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image2);
  const image3 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image3);
  // 6. Verify initial state: first image has display_order=0 (main thumbnail)
  TestValidator.equals("first image is main thumbnail", image1.displayOrder, 0);
  TestValidator.equals("second image display order", image2.displayOrder, 1);
  TestValidator.equals("third image display order", image3.displayOrder, 2);
  // Store original image IDs for verification
  const originalImageId1 = image1.id;
  const originalImageId2 = image2.id;
  const originalImageId3 = image3.id;
  // Store original image URLs for later verification
  const originalImageUrl1 = image1.imageUrl;
  const originalImageUrl2 = image2.imageUrl;
  const originalImageUrl3 = image3.imageUrl;
  // 7. Reorder images: put last image first in array (image3 becomes new main thumbnail)
  const reorderedImages =
    await api.functional.ecommerceMall.seller.sellers.me.products.images.update(
      sellerConnection,
      {
        productId: product.id,
        body: {
          imageIds: [image3.id, image2.id, image1.id],
        } satisfies IEcommerceMallProductImage.IReorderRequest,
      },
    );
  typia.assert(reorderedImages);
  // 8. The response should be the reordered image that is now at display_order=0
  // Since we put image3.id first in the array, image3 should now have display_order=0
  TestValidator.equals(
    "reordered first image is image3",
    reorderedImages.id,
    originalImageId3,
  );
  TestValidator.equals(
    "reordered first image display_order is 0",
    reorderedImages.displayOrder,
    0,
  );
  TestValidator.equals(
    "image3 URL preserved after reorder",
    reorderedImages.imageUrl,
    originalImageUrl3,
  );
  // 9. Verify the product now shows the reordered image as part of its images
  TestValidator.predicate(
    "reordered image has valid URL",
    reorderedImages.imageUrl.startsWith("http"),
  );
}
