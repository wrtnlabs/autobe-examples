import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
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
import { generate_random_ecommerce_mall_admin_admin_sellers_suspend } from "../../../generate/generate_random_ecommerce_mall_admin_admin_sellers_suspend";
import { prepare_random_ecommerce_mall_seller_suspension } from "../../../prepare/prepare_random_ecommerce_mall_seller_suspension";

/**
 * Test seller status-based access control for the product listing endpoint.
 *
 * Validates that the PATCH /ecommerceMall/seller/sellers/me/products endpoint enforces proper access control based on seller approval status. Sellers with 'pending' or 'rejected' status must receive HTTP 403 Forbidden when attempting to access product listings, while 'suspended' sellers retain read access to their products.
 *
 * Business rules being tested:
 * - Pending sellers cannot access product listings (awaiting admin approval)
 * - Rejected sellers cannot access product listings (registration denied)
 * - Suspended sellers CAN still view their products (suspension blocks write operations, not read)
 *
 * 1. Register new seller with 'pending' status → verify 403 Forbidden
 * 2. Register seller, admin rejects → verify 403 Forbidden for rejected seller
 * 3. Register seller, admin approves and suspends → verify 200 OK for suspended seller
 */
export async function test_api_seller_product_listing_status_access_control(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================
  // TEST CASE 1: PENDING SELLER - should receive 403 Forbidden
  // ============================================================
  // Create admin connection for managing sellers
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // Register a new seller (auto-assigned 'pending' status)
  const pendingSellerConnection: api.IConnection = { host: connection.host };
  const pendingSeller = await authorize_seller_join(pendingSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    },
  });
  // Verify seller is in pending status
  TestValidator.equals(
    "pending seller status",
    pendingSeller.approvalStatus,
    "pending",
  );
  // Attempt to access product listing as pending seller - should fail with 403
  await TestValidator.error(
    "pending seller cannot access product listing",
    async () => {
      await api.functional.ecommerceMall.seller.sellers.me.products.index(
        pendingSellerConnection,
        {
          body: {} satisfies IEcommerceMallProduct.IRequest,
        },
      );
    },
  );
  // ============================================================
  // TEST CASE 2: REJECTED SELLER - should receive 403 Forbidden
  // ============================================================
  // Register a new seller to be rejected
  const rejectedSellerConnection: api.IConnection = { host: connection.host };
  const rejectedSeller = await authorize_seller_join(rejectedSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    },
  });
  // Admin rejects the seller
  await api.functional.ecommerceMall.admin.admin.sellers.reject(
    adminConnection,
    {
      sellerId: rejectedSeller.id,
      body: {
        rejectionReason: "Incomplete business documentation",
      } satisfies IEcommerceMallSeller.IUpdate,
    },
  );
  typia.assert(rejectedSeller);
  // Login as rejected seller
  const rejectedLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(rejectedLoginConnection, {
    body: {
      email: rejectedSeller.email,
      password: "password123",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000/register",
    },
  });
  // Attempt to access product listing as rejected seller - should fail with 403
  await TestValidator.error(
    "rejected seller cannot access product listing",
    async () => {
      await api.functional.ecommerceMall.seller.sellers.me.products.index(
        rejectedLoginConnection,
        {
          body: {} satisfies IEcommerceMallProduct.IRequest,
        },
      );
    },
  );
  // ============================================================
  // TEST CASE 3: SUSPENDED SELLER - should receive 200 OK
  // ============================================================
  // Register a new seller to be approved and suspended
  const suspendedSellerConnection: api.IConnection = { host: connection.host };
  const suspendedSeller = await authorize_seller_join(
    suspendedSellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      },
    },
  );
  // Admin approves the seller
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      {
        sellerId: suspendedSeller.id,
      },
    );
  typia.assert(approvedSeller);
  // Verify seller is approved
  TestValidator.equals(
    "seller is approved",
    approvedSeller.approvalStatus,
    "approved",
  );
  // Admin suspends the approved seller
  await api.functional.ecommerceMall.admin.admin.sellers.suspend(
    adminConnection,
    {
      sellerId: approvedSeller.id,
      body: {
        reason: "Policy violation investigation",
      } satisfies IEcommerceMallSellerSuspension.ICreate,
    },
  );
  // Login as suspended seller
  const suspendedLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(suspendedLoginConnection, {
    body: {
      email: suspendedSeller.email,
      password: "password123",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000/register",
    },
  });
  // Suspended seller CAN still access product listing (read access) - should return 200
  const productList =
    await api.functional.ecommerceMall.seller.sellers.me.products.index(
      suspendedLoginConnection,
      {
        body: {} satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(productList);
  // Verify response structure
  TestValidator.equals("has pagination", productList.pagination !== null, true);
  TestValidator.equals("has data array", Array.isArray(productList.data), true);
}