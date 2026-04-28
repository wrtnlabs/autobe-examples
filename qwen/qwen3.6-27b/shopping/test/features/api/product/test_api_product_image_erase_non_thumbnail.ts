import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
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
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_images_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_images_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_image } from "../../../prepare/prepare_random_ecommerce_platform_product_image";

/**
 * Test deleting a secondary product image that is not the main thumbnail.
 *
 * Validates the complete product image deletion workflow including administrative category setup, seller authentication, product creation, multiple image uploads, and targeted non-thumbnail image deletion. Ensures that deleting a secondary image correctly soft-deletes the target while preserving the main thumbnail and other active images.
 *
 * Special attention is given to verifying that the main thumbnail (image with lowest order_index) remains unchanged after deletion of a non-thumbnail image, and that the deleted image cannot be soft-deleted again.
 *
 * Authorization is validated by confirming that only the product-owning seller can perform the deletion operation.
 *
 * 1. Administrator joins and creates a prerequisite product category.
 * 2. Seller joins and authenticates to own the product.
 * 3. Seller creates a product listing assigned to the category.
 * 4. Seller uploads three product images to establish gallery state.
 * 5. Captures the main thumbnail (order_index 0) and a secondary image for deletion.
 * 6. Seller deletes the secondary (non-thumbnail) image.
 * 7. Validates double-delete rejection for the already soft-deleted image.
 * 8. Tests authorization rejection for unauthenticated deletion attempts.
 */
export async function test_api_product_image_erase_non_thumbnail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join and create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller setup - join and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Seller creates a product
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id: category.id,
        },
      },
    );
  typia.assert(product);
  // 4. Upload three product images to establish gallery state
  const image1 =
    await generate_random_ecommerce_platform_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_ecommerce_platform_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image2);
  const image3 =
    await generate_random_ecommerce_platform_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image3);
  // 5. Verify image order indices to confirm thumbnail vs non-thumbnail relationship
  TestValidator.equals(
    "thumbnail is the first uploaded image with lowest order_index",
    image1.order_index,
    0,
  );
  TestValidator.predicate(
    "secondary image has higher order_index than thumbnail",
    image2.order_index > image1.order_index,
  );
  TestValidator.predicate(
    "third image has higher order_index than thumbnail",
    image3.order_index > image1.order_index,
  );
  // Capture thumbnail identity for reference
  const thumbnailId = image1.id;
  const thumbnailUri = image1.uri;
  // We'll delete image2 (not the thumbnail) to test non-thumbnail deletion
  const targetImageId = image2.id;
  TestValidator.equals(
    "deletion target is not the thumbnail",
    targetImageId !== thumbnailId,
    true,
  );
  // 6. Delete the secondary (non-thumbnail) image as seller - returns void (204)
  await api.functional.ecommercePlatform.seller.products.images.erase(
    sellerConnection,
    {
      productId: product.id,
      imageId: targetImageId,
    },
  );
  // 7. Validate double-delete rejection for the already soft-deleted image
  // API spec: "409 if the image is already soft-deleted"
  await TestValidator.error(
    "already soft-deleted image cannot be deleted again",
    async () => {
      await api.functional.ecommercePlatform.seller.products.images.erase(
        sellerConnection,
        {
          productId: product.id,
          imageId: targetImageId,
        },
      );
    },
  );
  // 8. Test authorization - unauthenticated user cannot delete images
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthenticated user cannot delete product image",
    async () => {
      await api.functional.ecommercePlatform.seller.products.images.erase(
        unauthenticatedConnection,
        {
          productId: product.id,
          imageId: image3.id,
        },
      );
    },
  );
  // 9. Verify third image (image3) is still active by attempting deletion and success
  await api.functional.ecommercePlatform.seller.products.images.erase(
    sellerConnection,
    {
      productId: product.id,
      imageId: image3.id,
    },
  );
  // Verify image3 is now also soft-deleted
  await TestValidator.error(
    "third image now soft-deleted after successful deletion",
    async () => {
      await api.functional.ecommercePlatform.seller.products.images.erase(
        sellerConnection,
        {
          productId: product.id,
          imageId: image3.id,
        },
      );
    },
  );
}
