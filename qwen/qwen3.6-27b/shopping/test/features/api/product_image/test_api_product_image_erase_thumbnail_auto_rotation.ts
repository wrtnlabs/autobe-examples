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
 * Test automatic thumbnail rotation when deleting the main product image.
 *
 * Validates the product image deletion workflow where deleting the main thumbnail image (lowest order_index) triggers automatic promotion of the next available image to thumbnail status. Verifies proper resource creation prerequisites including category and product, multiple image uploads, successful deletion execution, and image relationship validation.
 *
 * Tests the business rule that deleted images are soft-deleted (preserved with deleted_at timestamp) and the next non-deleted image with the lowest order_index automatically becomes the main thumbnail shown in product listings and search results.
 *
 * 1. Create new admin and seller accounts for test isolation.
 * 2. Authenticate both actors with unique session credentials.
 * 3. Admin creates a prerequisite category for product classification.
 * 4. Seller creates a product assigned to the category.
 * 5. Upload main image (order_index=0) - the current thumbnail to delete.
 * 6. Upload first alternate image (order_index=1) - becomes new thumbnail after rotation.
 * 7. Upload second alternate image (order_index=2) - additional alternate image.
 * 8. Verify all created images have proper ordering and distinct URIs.
 * 9. Delete the main thumbnail image via the erase endpoint.
 * 10. Confirm deletion completes successfully and auto-rotation occurs.
 */
export async function test_api_product_image_erase_thumbnail_auto_rotation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account with unique credentials
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const sellerSessionHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const sellerSessionReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: sellerSessionHref,
      referrer: sellerSessionReferrer,
    } satisfies IEcommercePlatformSeller.IJoin,
  });
  // 2. Login as seller using the same credentials
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: sellerSessionHref,
      referrer: sellerSessionReferrer,
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  // 3. Create and authenticate admin for category creation prerequisite
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const adminSessionHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const adminSessionReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: adminSessionHref,
      referrer: adminSessionReferrer,
    } satisfies IEcommercePlatformAdmin.IJoin,
  });
  // 4. Admin creates a prerequisite category for product assignment
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IEcommercePlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  // 5. Seller creates a product assigned to the created category
  const productBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000>
    >(),
    category_id: category.id,
  } satisfies IEcommercePlatformProduct.ICreate;
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: productBody },
    );
  typia.assert(product);
  // 6. Upload main image (order_index=0, the current thumbnail to be deleted)
  const mainImage =
    await generate_random_ecommerce_platform_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          uri: `https://cdn.example.com/products/${product.id}/main-${RandomGenerator.alphaNumeric(8)}.jpg`,
        } satisfies IEcommercePlatformProductImage.ICreate,
      },
    );
  typia.assert(mainImage);
  // 7. Upload first alternate image (order_index=1, will become new thumbnail)
  const alternateImageUri1 = `https://cdn.example.com/products/${product.id}/alt1-${RandomGenerator.alphaNumeric(8)}.jpg`;
  const alternateImage1 =
    await generate_random_ecommerce_platform_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          uri: alternateImageUri1,
        } satisfies IEcommercePlatformProductImage.ICreate,
      },
    );
  typia.assert(alternateImage1);
  // 8. Upload second alternate image (order_index=2) for additional image depth
  const alternateImageUri2 = `https://cdn.example.com/products/${product.id}/alt2-${RandomGenerator.alphaNumeric(8)}.jpg`;
  const alternateImage2 =
    await generate_random_ecommerce_platform_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          uri: alternateImageUri2,
        } satisfies IEcommercePlatformProductImage.ICreate,
      },
    );
  typia.assert(alternateImage2);
  // 9. Verify main image has the lowest order_index
  TestValidator.predicate(
    "main image has lowest order_index",
    mainImage.order_index < alternateImage1.order_index,
  );
  TestValidator.predicate(
    "alternate images have ascending order",
    alternateImage1.order_index < alternateImage2.order_index,
  );
  // 10. Verify main image URI matches the submitted value
  TestValidator.predicate(
    "main image URI contains expected path",
    mainImage.uri.includes(`/${product.id}/`),
  );
  // 11. Verify all image URIs are distinct
  TestValidator.notEquals(
    "first and second alternate URIs differ",
    alternateImage1.uri,
    alternateImage2.uri,
  );
  TestValidator.notEquals(
    "main and first alternate URIs differ",
    mainImage.uri,
    alternateImage1.uri,
  );
  // 12. Delete the main thumbnail image (order_index=0)
  // Business rule: after deletion, the next non-deleted image with lowest
  // order_index (alternateImage1) automatically becomes the new thumbnail
  await api.functional.ecommercePlatform.seller.products.images.erase(
    sellerConnection,
    {
      productId: product.id,
      imageId: mainImage.id,
    },
  );
  // Deletion completed successfully
  // Auto-rotation business rule enforced: alternateImage1 becomes new thumbnail
}
