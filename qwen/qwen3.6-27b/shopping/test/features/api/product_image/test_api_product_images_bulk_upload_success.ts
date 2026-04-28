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
 * Test bulk upload of multiple product images in a single test scenario.
 *
 * Validates the workflow where a seller uploads multiple product images to a product. The test sets up the required dependencies (admin, category, seller, product) and then uploads several images sequentially. Each image is validated to ensure it receives a unique UUID, correct URI, and sequential order index.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers and authenticates via login.
 * 3. Seller creates a product assigned to the category.
 * 4. Seller bulk uploads 3 product images to the product.
 * 5. Validate all images are created with unique IDs and sequential order indices (1, 2, 3).
 */
export async function test_api_product_images_bulk_upload_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller setup - register and login with known password
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: { password: sellerPassword, email: sellerEmail },
  });
  typia.assert(sellerJoin);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerJoin.email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  // 3. Seller creates product
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerLoginConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(product);
  // 4. Bulk upload 3 product images
  const numImages = 3;
  const images: IEcommercePlatformProductImage[] = [];
  for (let i = 0; i < numImages; i++) {
    const image =
      await generate_random_ecommerce_platform_seller_products_images_create(
        sellerLoginConnection,
        {
          params: { productId: product.id },
        },
      );
    typia.assert(image);
    images.push(image);
  }
  // 5. Validate results
  TestValidator.equals("total images uploaded", images.length, numImages);
  // Each image should have unique UUID
  const allUids = images.map((img) => img.id);
  const uniqueUids = Array.from(new Set(allUids));
  TestValidator.equals(
    "all image IDs are unique",
    uniqueUids.length,
    numImages,
  );
  // Order indices should be sequential starting from 1
  const expectedOrderIndices = ArrayUtil.repeat(numImages, (i) => i + 1);
  const actualOrderIndices = images.map((img) => img.order_index);
  TestValidator.equals(
    "order indices are sequential",
    actualOrderIndices,
    expectedOrderIndices,
  );
  // All images have non-null, non-deleted state
  await TestValidator.predicate("all images are not deleted", () =>
    images.every((img) => img.deleted_at === null),
  );
  // All Uris are valid URIs
  TestValidator.predicate("all URIs are valid", () =>
    images.every((img) => typeof img.uri === "string" && img.uri.length > 0),
  );
}
