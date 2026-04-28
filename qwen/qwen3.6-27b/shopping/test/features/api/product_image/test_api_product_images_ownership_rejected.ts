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
 * Test that a non-owning seller cannot add images to another seller's product.
 *
 * Validates the ownership restriction on the product image creation endpoint. An admin
 * prepares a category for product classification, then a first seller creates a product
 * in that category. A second, different seller is then authenticated and attempts to add
 * an image to the first seller's product. The server checks whether the product's
 * ecommerce_platform_seller_profile_id matches the requesting seller's profile and rejects
 * the unauthorized attempt with a 403 Forbidden error response.
 *
 * Special attention is given to ensuring that unrelated sellers cannot manipulate product
 * media assets belonging to other shops, protecting seller ownership of their listed products.
 *
 * 1. Admin joins and authenticates.
 * 2. Admin creates a product category.
 * 3. First seller joins and authenticates.
 * 4. First seller creates a product in the category.
 * 5. Second seller joins and authenticates separately.
 * 6. Second seller attempts to add an image to the first seller's product.
 * 7. System rejects the request due to ownership mismatch.
 */
export async function test_api_product_images_ownership_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. First seller joins and creates a product
  const firstSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(firstSellerConnection, {});
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      firstSellerConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(product);
  // 3. Second seller joins with separate credentials
  const secondSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(secondSellerConnection, {});
  // 4. Second seller attempts to add image to first seller's product
  const body = {
    uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommercePlatformProductImage.ICreate;
  await TestValidator.error(
    "non-owning seller cannot add images to another seller's product",
    async () => {
      await api.functional.ecommercePlatform.seller.products.images.create(
        secondSellerConnection,
        {
          productId: product.id,
          body,
        },
      );
    },
  );
}
