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
 * Test the showDeleted filter parameter behavior on the product image gallery endpoint.
 *
 * Validates that product image listing correctly toggles visibility of soft-deleted images based on the showDeleted request parameter. When omitted or false, only active images are returned. When true, both active and soft-deleted images appear in the response, enabling audit trail access for archived images.
 *
 * Special attention is given to verifying that deleted images retain their order_index and timestamps while being marked with deleted_at populated, ensuring soft deletion preserves image metadata for historical tracking.
 *
 * 1. Administrator joins and creates a category.
 * 2. Seller joins and creates a product assigned to that category.
 * 3. Seller adds three product images to the product.
 * 4. Seller soft-deletes one of the images.
 * 5. Query images without showDeleted to verify only active images are returned.
 * 6. Query images with showDeleted=true to confirm deleted images appear with deleted_at populated.
 * 7. Validate deleted images retain order_index and lifecycle timestamps.
 */
export async function test_api_product_image_gallery_filter_deleted_images(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller joins and creates product
  const SELLER_EMAIL = typia.random<string & tags.Format<"email">>();
  const SELLER_PASSWORD = typia.random<string & tags.Format<"password">>();
  const SELLER_HREF = typia.random<string & tags.Format<"uri">>();
  const SELLER_REFERRER = typia.random<string & tags.Format<"uri">>();
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: SELLER_EMAIL,
      password: SELLER_PASSWORD,
      href: SELLER_HREF,
      referrer: SELLER_REFERRER,
    },
  });
  typia.assert(sellerJoin);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: SELLER_EMAIL,
      password: SELLER_PASSWORD,
      href: SELLER_HREF,
      referrer: SELLER_REFERRER,
    },
  });
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerLoginConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(product);
  // 3. Add three product images
  const image1 =
    await generate_random_ecommerce_platform_seller_products_images_create(
      sellerLoginConnection,
      { params: { productId: product.id } },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_ecommerce_platform_seller_products_images_create(
      sellerLoginConnection,
      { params: { productId: product.id } },
    );
  typia.assert(image2);
  const image3 =
    await generate_random_ecommerce_platform_seller_products_images_create(
      sellerLoginConnection,
      { params: { productId: product.id } },
    );
  typia.assert(image3);
  // 4. Soft-delete one image
  await api.functional.ecommercePlatform.seller.products.images.erase(
    sellerLoginConnection,
    {
      productId: product.id,
      imageId: image3.id,
    },
  );
  // 5. Query without showDeleted - should return only active images (2)
  const bodyWithoutDeleted = {
    showDeleted: false,
  } satisfies IEcommercePlatformProductImage.IRequest;
  const pageWithoutDeleted =
    await api.functional.ecommercePlatform.products.images.index(
      { host: connection.host },
      {
        productId: product.id,
        body: bodyWithoutDeleted,
      },
    );
  typia.assert(pageWithoutDeleted);
  TestValidator.equals(
    "active images count without showDeleted",
    pageWithoutDeleted.pagination.records,
    2,
  );
  TestValidator.equals(
    "active data length without showDeleted",
    pageWithoutDeleted.data.length,
    2,
  );
  // Verify no deleted images in result
  const hasDeletedWithout = ArrayUtil.has(
    pageWithoutDeleted.data,
    (img) => img.deleted_at !== null,
  );
  TestValidator.predicate(
    "no deleted images without showDeleted",
    hasDeletedWithout === false,
  );
  // 6. Query with showDeleted=true - should return all images (3)
  const bodyWithDeleted = {
    showDeleted: true,
  } satisfies IEcommercePlatformProductImage.IRequest;
  const pageWithDeleted =
    await api.functional.ecommercePlatform.products.images.index(
      { host: connection.host },
      {
        productId: product.id,
        body: bodyWithDeleted,
      },
    );
  typia.assert(pageWithDeleted);
  TestValidator.equals(
    "total images count with showDeleted=true",
    pageWithDeleted.pagination.records,
    3,
  );
  // 7. Validate deleted image has deleted_at populated and retains order_index
  const deletedImage = pageWithDeleted.data.find(
    (img) => img.id === image3.id,
  )!;
  typia.assertGuard(deletedImage);
  TestValidator.predicate(
    "deleted image has deleted_at populated",
    deletedImage.deleted_at !== null,
  );
  TestValidator.predicate(
    "deleted image retains valid order_index",
    deletedImage.order_index > 0,
  );
  // Verify active images still have null deleted_at
  const activeImageWithShowDeleted = pageWithDeleted.data.find(
    (img) => img.id === image1.id,
  )!;
  typia.assertGuard(activeImageWithShowDeleted);
  TestValidator.equals(
    "active image has null deleted_at",
    activeImageWithShowDeleted.deleted_at,
    null,
  );
}
