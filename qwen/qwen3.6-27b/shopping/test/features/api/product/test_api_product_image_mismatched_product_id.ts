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
 * Test product-image ownership validation by attempting to retrieve an image with a mismatched productId.
 *
 * Validates that the product image retrieval endpoint enforces proper scoping by rejecting requests where the productId parameter does not match the image's actual parent product. This ensures images cannot be accessed using another product's ID, even if the imageId is valid.
 *
 * The test verifies the 404 Not Found response when a valid imageId is paired with a non-matching productId, confirming that the endpoint performs ownership validation rather than just checking image existence.
 *
 * 1. Administrator joins and creates a product category.
 * 2. Seller joins and creates two separate products (Product A and Product B) assigned to the same category.
 * 3. An image is added only to Product A.
 * 4. Attempt to retrieve Product A's image using Product B's productId and Product A's valid imageId.
 * 5. Verify the system returns 404 because the image does not belong to Product B.
 */
export async function test_api_product_image_mismatched_product_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller joins and creates two products
  const sellerJoinEmail = typia.random<string & tags.Format<"email">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: { email: sellerJoinEmail },
  });
  typia.assert(sellerAuth);
  // Create Product A
  const productA =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: { category_id: category.id },
      },
    );
  typia.assert(productA);
  // Create Product B
  const productB =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: { category_id: category.id },
      },
    );
  typia.assert(productB);
  // 3. Add image only to Product A
  const imageOnA =
    await generate_random_ecommerce_platform_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: productA.id },
        body: {},
      },
    );
  typia.assert(imageOnA);
  // 4 & 5. Attempt to retrieve image from Product A using Product B's productId
  // This should return 404 because the image belongs to Product A, not Product B
  const requestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "404 when retrieving image with mismatched productId",
    async () => {
      await api.functional.ecommercePlatform.products.images.at(
        requestConnection,
        {
          productId: productB.id,
          imageId: imageOnA.id,
        },
      );
    },
  );
}
