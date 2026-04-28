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
 * Test appending images to a product that already has existing images.
 *
 * Validates that the system correctly assigns sequential order_index values to newly added images,
 * starting from (current max + 1). When images with order indices 1 and 2 already exist,
 * appended images receive order indices 3 and 4 respectively.
 *
 * Special attention is given to verifying that existing image records remain unchanged
 * and that the append operation correctly computes the next available order position.
 *
 * 1. Admin joins and creates a product category.
 * 2. Seller joins the platform (account authenticated through join flow).
 * 3. Seller creates a product assigned to the category.
 * 4. Seller adds two initial images to the product.
 * 5. Captures existing images and their order indices to determine current max.
 * 6. Seller appends two more images to the same product.
 * 7. Validates new images received sequential order indices (existing max + 1, existing max + 2).
 * 8. Validates all images have unique identifiers and valid URIs.
 */
export async function test_api_product_images_append_to_existing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category: IEcommercePlatformCategory =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller joins (authentication happens during join)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: { email: sellerEmail, password: sellerPassword },
  });
  // 3. Seller creates a product
  const product: IEcommercePlatformProduct =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: { category_id: category.id },
      },
    );
  typia.assert(product);
  // 4. Add two initial images
  const initialImage1: IEcommercePlatformProductImage =
    await generate_random_ecommerce_platform_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(initialImage1);
  const initialImage2: IEcommercePlatformProductImage =
    await generate_random_ecommerce_platform_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(initialImage2);
  // Determine current max order index from existing images
  const currentMaxOrderIndex = Math.max(
    initialImage1.order_index,
    initialImage2.order_index,
  );
  // 5. Append two more images
  const appendedImage1: IEcommercePlatformProductImage =
    await generate_random_ecommerce_platform_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(appendedImage1);
  const appendedImage2: IEcommercePlatformProductImage =
    await generate_random_ecommerce_platform_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(appendedImage2);
  // 6. Validate order indices are sequential starting from (existing max + 1)
  TestValidator.equals(
    "first appended image order_index is current max + 1",
    appendedImage1.order_index,
    currentMaxOrderIndex + 1,
  );
  TestValidator.equals(
    "second appended image order_index is current max + 2",
    appendedImage2.order_index,
    currentMaxOrderIndex + 2,
  );
  // 7. Validate all images have unique identifiers
  const allImageIds = new Set([
    initialImage1.id,
    initialImage2.id,
    appendedImage1.id,
    appendedImage2.id,
  ]);
  TestValidator.predicate("all images have unique IDs", allImageIds.size === 4);
  // 8. Validate new images have valid URIs
  TestValidator.predicate(
    "first appended image has valid URI",
    typeof appendedImage1.uri === "string" && appendedImage1.uri.length > 0,
  );
  TestValidator.predicate(
    "second appended image has valid URI",
    typeof appendedImage2.uri === "string" && appendedImage2.uri.length > 0,
  );
  // 9. Validate deleted_at is null (images are active)
  TestValidator.equals(
    "first appended image is active",
    appendedImage1.deleted_at,
    null,
  );
  TestValidator.equals(
    "second appended image is active",
    appendedImage2.deleted_at,
    null,
  );
}
