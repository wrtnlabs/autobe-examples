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
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";

/**
 * Test authorization enforcement for product deletion by an unauthorized seller.
 *
 * Validates that only the product owner can delete their product listings through the seller endpoint. Sets up a multi-actor scenario with an administrator creating prerequisite category data, Seller A creating a product, and Seller B (a different seller account) attempting to delete Seller A's product.
 *
 * The system enforces ownership authorization before executing the deletion operation, checking the authenticated seller's profile against the product's owner profile. Since Seller B is not the product owner, the operation must return 403 Forbidden, protecting seller intellectual property and marketplace integrity.
 *
 * 1. Authenticate as administrator to create prerequisite category for product classification.
 * 2. Create a product category through admin endpoint.
 * 3. Register and authenticate as Seller A to act as the product owner.
 * 4. Seller A creates a product in the assigned category.
 * 5. Register and authenticate as Seller B as an unauthorized actor.
 * 6. Seller B attempts to delete Seller A's product and receives 403 Forbidden.
 */
export async function test_api_product_deletion_unauthorized_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  // 2. Admin creates a category
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(category);
  // 3. Seller A (product owner) joins
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: "sellerA@test.com",
      password: "1234",
    },
  });
  typia.assert(sellerA);
  // 4. Seller A creates a product
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerAConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          base_price: 10000,
          category_id: category.id,
        },
      },
    );
  typia.assert(product);
  // 5. Seller B (unauthorized) joins
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: "sellerB@test.com",
      password: "1234",
    },
  });
  typia.assert(sellerB);
  // 6. Seller B attempts to delete Seller A's product - should fail with 403
  await TestValidator.httpError(
    "unauthorized seller cannot delete product",
    403,
    async () => {
      await api.functional.ecommercePlatform.seller.products.erase(
        sellerBConnection,
        {
          productId: product.id,
        },
      );
    },
  );
}
