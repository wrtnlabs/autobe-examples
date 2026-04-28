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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformProductImage";
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
 * Test browsing product image gallery with populated images.
 *
 * Validates the complete product image gallery browsing flow including administrative category setup, seller product creation, and multiple image uploads. Ensures that public users can retrieve paginated image summaries ordered by order_index ascending with correct pagination metadata.
 *
 * Special attention is given to verifying that each image contains the required uri, order_index, and lifecycle timestamps (created_at, updated_at, deleted_at). The response pagination metadata including current page, limit, total records, and total pages is validated for correctness.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers and creates a product assigned to the category.
 * 3. Seller adds multiple product images (3 images) to the product.
 * 4. Public user browses product images with pagination parameters.
 * 5. Validates pagination metadata and image data integrity.
 */
export async function test_api_product_image_gallery_browse_multiple_images(
  connection: api.IConnection,
): Promise<void> {
  /* ========================================================================
   * 1. Administrator: register and create category
   * ========================================================================
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  /* ========================================================================
   * 2. Seller: register and create product
   * ========================================================================
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(product);
  /* ========================================================================
   * 3. Seller: add multiple images to the product
   * ========================================================================
   */
  const image1 =
    await generate_random_ecommerce_platform_seller_products_images_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_ecommerce_platform_seller_products_images_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(image2);
  const image3 =
    await generate_random_ecommerce_platform_seller_products_images_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(image3);
  /* ========================================================================
   * 4. Public: browse product images with pagination
   * ========================================================================
   */
  const publicConnection: api.IConnection = { host: connection.host };
  const browseBody = {
    page: 1 satisfies number as number,
    limit: 10 satisfies number as number,
  } satisfies IEcommercePlatformProductImage.IRequest;
  const paginatedImages =
    await api.functional.ecommercePlatform.products.images.index(
      publicConnection,
      {
        productId: product.id,
        body: browseBody,
      },
    );
  typia.assert(paginatedImages);
  /* ========================================================================
   * 5. Validate pagination metadata
   * ========================================================================
   */
  TestValidator.equals(
    "current page is 1",
    paginatedImages.pagination.current,
    1,
  );
  TestValidator.equals("limit is 10", paginatedImages.pagination.limit, 10);
  TestValidator.predicate(
    "has expected number of records (at least 3)",
    paginatedImages.pagination.records >= 3,
  );
  TestValidator.predicate(
    "has at least 1 page",
    paginatedImages.pagination.pages >= 1,
  );
  /* ========================================================================
   * 6. Validate image data in response
   * ========================================================================
   */
  TestValidator.predicate(
    "should contain at least 3 images in data array",
    paginatedImages.data.length >= 3,
  );
  /* Validate each image has non-empty uri (business logic) */
  for (const image of paginatedImages.data) {
    TestValidator.predicate(
      `image [${image.id}] has non-empty uri`,
      image.uri.length > 0,
    );
  }
  /* ========================================================================
   * 7. Validate images are ordered by order_index ascending
   * ========================================================================
   */
  for (let i = 1; i < paginatedImages.data.length; i++) {
    TestValidator.predicate(
      `image [${i}] order_index >= image [${i - 1}] order_index`,
      paginatedImages.data[i].order_index >=
        paginatedImages.data[i - 1].order_index,
    );
  }
  /* ========================================================================
   * 8. Validate image product reference
   * ========================================================================
   */
  TestValidator.predicate(
    "each image references the correct product",
    paginatedImages.data.every((img) => img.product.id === product.id),
  );
}
