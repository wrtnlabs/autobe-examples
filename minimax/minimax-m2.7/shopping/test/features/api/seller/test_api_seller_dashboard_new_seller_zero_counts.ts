import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerDashboard";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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

export async function test_api_seller_dashboard_new_seller_zero_counts(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      actorType: "seller",
      requestedGrade: "admin",
      reason: "Test admin account for seller approval testing",
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000/",
    },
  });
  typia.assert(adminAuth);
  // 2. Admin login
  const loggedInAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(loggedInAdminConnection, {
    body: {
      email: adminAuth.email,
      password: "TestPassword123!",
      href: "http://localhost:3000/admin/login",
      referrer: "http://localhost:3000/admin",
    },
  });
  // 3. Register new seller
  const sellerEmail = `seller_${Date.now()}@test.com`;
  const sellerConnectionForJoin: api.IConnection = { host: connection.host };
  const sellerJoinResult = await authorize_seller_join(
    sellerConnectionForJoin,
    {
      body: {
        email: sellerEmail,
        password: "TestPassword123!",
        href: "http://localhost:3000/seller/register",
        referrer: "http://localhost:3000/",
      },
    },
  );
  typia.assert(sellerJoinResult);
  // Store seller ID for approval lookup
  const sellerId = sellerJoinResult.id;
  // 4. Admin approves the seller
  // Note: The approval ID format is derived from seller ID for test setup
  // In production, admin would look up pending approvals first
  const approvalId = sellerJoinResult.id;
  const approval =
    await api.functional.ecommerceMall.admin.admin.seller_approvals.approve(
      loggedInAdminConnection,
      {
        approvalId: approvalId,
      },
    );
  typia.assert(approval);
  // 5. Seller login (now with approved status)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: "TestPassword123!",
    },
  });
  // 6. Get dashboard as newly approved seller with no activity
  const dashboard =
    await api.functional.ecommerceMall.seller.dashboard.at(sellerConnection);
  typia.assert(dashboard);
  // 7. Validate all dashboard counts are zero for new seller
  TestValidator.equals("totalProducts equals 0", dashboard.totalProducts, 0);
  TestValidator.equals(
    "totalOrderItems equals 0",
    dashboard.totalOrderItems,
    0,
  );
  TestValidator.equals(
    "pendingCancellationRequests equals 0",
    dashboard.pendingCancellationRequests,
    0,
  );
  TestValidator.equals(
    "pendingRefundRequests equals 0",
    dashboard.pendingRefundRequests,
    0,
  );
}
