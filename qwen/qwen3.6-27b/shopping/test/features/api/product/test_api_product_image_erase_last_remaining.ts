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
 * Test deleting the only remaining product image, verifying the product persists without images.
 *
 * Creates a product with exactly one image, then deletes that single image to test the edge case
 * where a product loses its last visual asset. Confirms that the image soft-deletion succeeds
 * without removing the product itself, leaving the product with an empty images array and a null
 * thumbnail URI in responses.
 *
 * This tests the specification rule: "If the last remaining image is deleted, the product will
 * display without images." The product remains browseable in the marketplace despite having no
 * visual assets associated with it.
 *
 * 1. Administrator creates a prerequisite category for product assignment.
 * 2. Seller registers and authenticates to gain product management permissions.
 * 3. Seller creates a product listing assigned to the category.
 * 4. Seller uploads exactly one image as the sole visual asset for the product.
 * 5. Seller deletes the only image, verifying successful deletion and product persistence.
 *
 * Edge case: Single-image deletion resulting in a product with zero images and a null thumbnail.
 */
export async function test_api_product_image_erase_last_remaining(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Admin creates prerequisite category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Setup seller credentials
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  // 3. Register the seller account with explicit credentials
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: { email: sellerEmail, password: sellerPassword },
  });
  typia.assert(sellerAuth);
  // 4. Authenticate seller for product operations
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://seller.example.com/login",
      referrer: "https://seller.example.com/",
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  // 5. Create product owned by the seller in the category
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(product);
  // 6. Upload exactly one image to the product
  const image =
    await api.functional.ecommercePlatform.seller.products.images.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          uri: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommercePlatformProductImage.ICreate,
      },
    );
  typia.assert(image);
  // 7. Delete the only remaining image on the product
  // Successful deletion (no exception) confirms the image is soft-deleted
  // and the product persists, now displaying without any images.
  await api.functional.ecommercePlatform.seller.products.images.erase(
    sellerConnection,
    {
      productId: product.id,
      imageId: image.id,
    },
  );
}
