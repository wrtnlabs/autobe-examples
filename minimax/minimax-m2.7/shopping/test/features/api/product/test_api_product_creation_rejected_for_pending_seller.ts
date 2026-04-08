import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test that a seller with pending approval status cannot create products and receives 403 Forbidden.
 *
 * Validates the platform's seller approval workflow by ensuring that newly registered sellers who have not yet been approved by an administrator cannot list products. This test verifies the authorization boundary between pending and approved seller states.
 *
 * The test follows this workflow:
 * 1. An administrator registers and authenticates on the platform.
 * 2. The administrator creates a product category required for product listing.
 * 3. A seller registers with email and password credentials.
 * 4. The seller remains in pending approval status (admin does not approve).
 * 5. The pending seller authenticates via login endpoint.
 * 6. The pending seller attempts to create a new product.
 * 7. The system rejects the product creation with 403 Forbidden status.
 *
 * Business Rules Validated:
 * - Sellers must be approved before they can list products.
 * - Product creation endpoint should return 403 for pending sellers.
 * - Error message should indicate that seller approval is required.
 */
export async function test_api_product_creation_rejected_for_pending_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and authenticates on the platform
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!",
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // 2. Admin creates a product category for testing
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(category);
  // 3. Seller joins the platform with email and password
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "SellerPass123!";
  const sellerJoinResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerJoinResult);
  // Verify seller is in pending status (admin does NOT approve)
  TestValidator.equals(
    "seller approval status is pending",
    sellerJoinResult.approvalStatus,
    "pending",
  );
  // 4. Authenticate as the pending seller using login endpoint
  const pendingSellerConnection: api.IConnection = { host: connection.host };
  const sellerLoginResult = await authorize_seller_login(
    pendingSellerConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.ILogin,
    },
  );
  typia.assert(sellerLoginResult);
  // Verify seller is still in pending status after login
  TestValidator.equals(
    "seller status still pending after login",
    sellerLoginResult.approvalStatus,
    "pending",
  );
  // 5. Attempt to create a new product (should fail with 403)
  await TestValidator.httpError(
    "product creation rejected for pending seller",
    403,
    async () => {
      await api.functional.ecommerceMall.seller.sellers.me.products.create(
        pendingSellerConnection,
        {
          body: {
            name: "Test Product",
            description: "This product should not be created",
            categoryId: category.id,
            basePrice: 99.99,
          } satisfies IEcommerceMallProduct.ICreate,
        },
      );
    },
  );
}
