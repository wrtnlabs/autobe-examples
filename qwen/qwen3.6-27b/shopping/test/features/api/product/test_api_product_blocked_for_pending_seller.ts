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
 * Test that sellers with pending approval status are blocked from creating products.
 *
 * Valid

ates the business rule that only administrators can approve sellers, and unapproved sellers cannot list products in the marketplace. The test registers a seller (which creates a pending account by default) without ever approving them, then attempts product creation with valid product data to confirm the operation is rejected.
 *
 * Special attention is given to ensuring that the rejection is based on approval status rather than data validation errors. The product request includes a valid category reference and properly formatted fields to isolate the approval-based business rule.
 *
 * 1. Administrator joins the platform with credentials.
 * 2. Administrator creates a product category for reference.
 * 3. Seller registers with credentials (approval status defaults to 'pending').
 * 4. Seller is authenticated with their pending account.
 * 5. Seller attempts to create a product with valid name, description, category assignment, and base price.
 * 6. Product creation is rejected due to pending seller approval status.
 */
export async function test_api_product_blocked_for_pending_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuthorized);
  // 2. Admin creates a category (needed as prerequisite)
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Seller joins (approval_status defaults to 'pending')
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    href: "https://example.com/seller/register",
    referrer: "https://example.com/",
  } satisfies IEcommercePlatformSeller.IJoin;
  const sellerJoinResponse = await authorize_seller_join(sellerJoinConnection, {
    body: sellerJoin,
  });
  typia.assert(sellerJoinResponse);
  // Verify seller is pending
  TestValidator.equals(
    "seller approval_status is pending",
    sellerJoinResponse.approval_status,
    "pending",
  );
  // 4. Authenticate as seller (using login with the same credentials)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoin.email,
      password: sellerJoin.password,
      href: "https://example.com/seller/login",
      referrer: "https://example.com/",
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  // 5. Seller (pending) attempts to create a product with valid data
  const productBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    category_id: category.id,
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000>
    >(),
  } satisfies IEcommercePlatformProduct.ICreate;
  // 6. Product creation is REJECTED because seller is pending
  await TestValidator.error(
    "pending seller cannot create product",
    async () => {
      await api.functional.ecommercePlatform.seller.products.create(
        sellerConnection,
        { body: productBody },
      );
    },
  );
}
