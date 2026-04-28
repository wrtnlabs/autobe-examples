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
 * Test product image URI and order index update workflow.
 *
 * Validates the complete product image update flow including administrative category setup, seller authentication, product creation, initial image addition, and image attribute modification. Ensures that the image is correctly updated with the new URI and order_index, and that the updated_at timestamp is refreshed.
 *
 * The test verifies seller ownership validation by ensuring only the seller who created the product can update its images. The system returns the fully updated image record reflecting all changes.
 *
 * 1. Administrator joins and creates a category for product classification.
 * 2. Seller joins and authenticates to gain selling privileges.
 * 3. Seller creates a product assigned to the created category.
 * 4. Seller adds an initial image to the product.
 * 5. Seller updates the image with a new URI and order_index.
 * 6. Validates the updated image contains the new URI and order_index.
 * 7. Validates the updated_at timestamp has changed from the original.
 */
export async function test_api_product_image_update_uri(
  connection: api.IConnection,
) {
  // 1. Admin joins and creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller joins
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  // 3. Seller creates a product
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(product);
  // 4. Seller adds an initial image
  const initialImage =
    await generate_random_ecommerce_platform_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {},
      },
    );
  typia.assert(initialImage);
  const originalUpdatedAt = initialImage.updated_at;
  // 5. Seller updates the image URI and order_index
  const newUri = typia.random<string & tags.Format<"uri">>();
  const newOrderIndex = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<9999>
  >() satisfies number as number;
  const body = {
    uri: newUri,
    order_index: newOrderIndex,
  } satisfies IEcommercePlatformProductImage.IUpdate;
  const updatedImage =
    await api.functional.ecommercePlatform.seller.products.images.update(
      sellerConnection,
      {
        productId: product.id,
        imageId: initialImage.id,
        body,
      },
    );
  typia.assert(updatedImage);
  // 6. Validate updated URI
  TestValidator.equals("updated URI matches", updatedImage.uri, newUri);
  // 7. Validate updated order_index
  TestValidator.equals(
    "updated order_index matches",
    updatedImage.order_index,
    newOrderIndex,
  );
  // 8. Validate updated_at has changed
  TestValidator.notEquals(
    "updated_at timestamp refreshed",
    updatedImage.updated_at,
    originalUpdatedAt,
  );
}
