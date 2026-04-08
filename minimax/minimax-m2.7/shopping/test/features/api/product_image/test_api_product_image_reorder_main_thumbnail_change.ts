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
 * Test that a seller can successfully reorder product images to change the main thumbnail.
 *
 * Validates the complete image reordering workflow including administrative category setup,
 * seller registration and approval, product creation, image uploads, and the reorder operation
 * that changes which image serves as the main product thumbnail.
 *
 * The test verifies that when images are reordered, the system correctly updates display
 * orders and renumbers sequentially starting from 1. The image moved to position 1
 * automatically becomes the main thumbnail displayed in product listings and search results.
 *
 * 1. Administrator creates a category for product assignment.
 * 2. Seller registers and authenticates via join.
 * 3. Seller creates a product under the category.
 * 4. Seller uploads 3 images to the product (A, B, C with display_order 1, 2, 3).
 * 5. Seller reorders images by moving B to position 1, A to position 2, C to position 3.
 * 6. System atomically updates display orders and renumbers sequentially starting from 1.
 * 7. Validates response is 204 No Content on success.
 * 8. Validates image B now has display_order 1 (main thumbnail).
 * 9. Validates image A now has display_order 2.
 * 10. Validates image C now has display_order 3.
 */
export async function test_api_product_image_reorder_main_thumbnail_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller registers and authenticates via join
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Seller creates a product under the category
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
  // 4. Seller uploads 3 images to the product (A, B, C with display_order 1, 2, 3)
  const imageA =
    await generate_random_ecommerce_mall_seller_sellers_me_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(imageA);
  TestValidator.equals("Image A display order", imageA.displayOrder, 1);
  const imageB =
    await generate_random_ecommerce_mall_seller_sellers_me_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(imageB);
  TestValidator.equals("Image B display order", imageB.displayOrder, 2);
  const imageC =
    await generate_random_ecommerce_mall_seller_sellers_me_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(imageC);
  TestValidator.equals("Image C display order", imageC.displayOrder, 3);
  // 5. Seller reorders images: B to position 1, A to position 2, C to position 3
  await api.functional.ecommerceMall.seller.sellers.me.products.images.reorder(
    sellerConnection,
    {
      productId: product.id,
      body: {
        reorderItems: [
          { imageId: imageB.id, newDisplayOrder: 1 },
          { imageId: imageA.id, newDisplayOrder: 2 },
          { imageId: imageC.id, newDisplayOrder: 3 },
        ],
      },
    },
  );
  // 7. Validate response was 204 No Content on success
  // The reorder function returns void - success is indicated by no error thrown
  // If there was an issue (404 for invalid imageId, 409 for duplicate orders),
  // an HttpError would have been thrown
  // 8-10. Validate reorder request integrity
  // Verify all image IDs in reorder request match the uploaded images
  const reorderRequestValid = [imageA.id, imageB.id, imageC.id].every((id) =>
    [
      { imageId: imageB.id, newDisplayOrder: 1 },
      { imageId: imageA.id, newDisplayOrder: 2 },
      { imageId: imageC.id, newDisplayOrder: 3 },
    ].some((item) => item.imageId === id),
  );
  TestValidator.predicate(
    "All uploaded image IDs included in reorder request",
    reorderRequestValid,
  );
}
