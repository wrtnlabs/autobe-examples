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
 * Tests the database unique constraint on product image order_index values within a product's image collection.
 *
 * Validates that updating a product image to have the same order_index as another image belonging to the same product triggers a 409 Conflict HTTP error. This tests the @@unique([ecommerce_platform_product_id, order_index]) constraint that enforces distinct display positions for each image within a product's gallery.
 *
 * 1. Administrator authenticates and creates a category for product assignment.
 * 2. Seller registers a new account and authenticates.
 * 3. Seller creates a product associated with the previously created category.
 * 4. Seller creates two distinct product images, each receiving an automatically assigned order_index.
 * 5. Seller attempts to update the second image's order_index to match the first image's order_index.
 * 6. The update fails with a 409 Conflict due to the unique constraint violation.
 */
export async function test_api_product_image_update_order_conflict(
  connection: api.IConnection,
) {
  // 1. Administrator setup - authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      password: RandomGenerator.alphaNumeric(16),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformAdmin.ILogin,
  });
  // 2. Admin creates a category for product assignment
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Seller registration - prepare credentials
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  // 4. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      href: typia.random<string & tags.Format<"uri">>(),
      password: sellerPassword,
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformSeller.IJoin,
  });
  typia.assert(sellerJoin);
  // 5. Seller login with stored credentials
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoin.email,
      href: typia.random<string & tags.Format<"uri">>(),
      password: sellerPassword,
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  // 6. Seller creates a product with the category
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id: category.id,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          name: RandomGenerator.name(),
          base_price: typia.random<number & tags.Minimum<0>>(),
        } satisfies IEcommercePlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // 7. Create first product image with auto-assigned order_index
  const firstImage =
    await generate_random_ecommerce_platform_seller_products_images_create(
      sellerConnection,
      {
        body: {},
        params: { productId: product.id },
      },
    );
  typia.assert(firstImage);
  // 8. Create second product image with different auto-assigned order_index
  const secondImage =
    await generate_random_ecommerce_platform_seller_products_images_create(
      sellerConnection,
      {
        body: {},
        params: { productId: product.id },
      },
    );
  typia.assert(secondImage);
  // 9. Verify images have distinct order indices
  TestValidator.notEquals(
    "images must have distinct order indices before conflict update",
    firstImage.order_index,
    secondImage.order_index,
  );
  // 10. Attempt to update second image to have the same order_index as first image - should fail with 409
  await TestValidator.error(
    "duplicate order_index causes 409 conflict due to unique constraint",
    async () => {
      await api.functional.ecommercePlatform.seller.products.images.update(
        sellerConnection,
        {
          productId: product.id,
          imageId: secondImage.id,
          body: {
            order_index: firstImage.order_index,
          } satisfies IEcommercePlatformProductImage.IUpdate,
        },
      );
    },
  );
}
