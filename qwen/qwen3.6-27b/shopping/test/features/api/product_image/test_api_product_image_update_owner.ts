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
 * Test that unauthorized sellers cannot update product images.
 *
 * Validates ownership enforcement on product image updates. An admin creates a category, the product owner seller creates a product with an image, then a second unauthorized seller attempts to modify the same image by providing a new URI. The system rejects the update with a 403 Forbidden response because the product's seller_profile_id does not match the requesting seller's profile ID.
 *
 * Tests the authorization layer that validates seller ownership before allowing image modifications. Ensures sellers can only update images for products they own, preventing unauthorized sellers from modifying other sellers' product content.
 *
 * 1. Admin joins and creates a category.
 * 2. Owner seller joins and creates a product in the category, then adds an image.
 * 3. Unauthorized second seller joins and attempts to update the same product's image with a new URI.
 * 4. System rejects the update with 403 Forbidden due to seller_profile_id mismatch.
 */
export async function test_api_product_image_update_owner(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Admin creates category
  const category: IEcommercePlatformCategory =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Owner seller joins
  const ownerSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(ownerSellerConnection, {});
  // 4. Owner seller creates product with the category
  const product: IEcommercePlatformProduct =
    await generate_random_ecommerce_platform_seller_products_create(
      ownerSellerConnection,
      {
        body: {
          category_id: category.id,
        },
      },
    );
  typia.assert(product);
  // 5. Owner seller adds an image to the product
  const image: IEcommercePlatformProductImage =
    await generate_random_ecommerce_platform_seller_products_images_create(
      ownerSellerConnection,
      {
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(image);
  // 6. Unauthorized second seller joins
  const unauthorizedSellerConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_seller_join(unauthorizedSellerConnection, {});
  // 7. Unauthorized second seller attempts to update the image (should fail with 403)
  await TestValidator.httpError(
    "unauthorized seller cannot update product image",
    403,
    async () =>
      await api.functional.ecommercePlatform.seller.products.images.update(
        unauthorizedSellerConnection,
        {
          productId: product.id,
          imageId: image.id,
          body: {
            uri: typia.random<string & tags.Format<"uri">>(),
          } satisfies IEcommercePlatformProductImage.IUpdate,
        },
      ),
  );
}