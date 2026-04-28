import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerApprovalRequest";
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

/**
 * Test retrieving a pending seller approval request by its unique ID.
 *
 * Validates the seller approval request retrieval workflow where an administrator accesses a specific pending approval request created during seller registration. The test confirms that newly registered sellers have approval requests with 'pending' status, null rejection reasons (since no admin decision has been made), and properly linked seller associations.
 *
 * This test follows the natural seller onboarding flow: administrator registration, seller registration triggering auto-creation of pending approval request, then administrator retrieval of that request for review.
 *
 * 1. Administrator registers with random credentials for platform access.
 * 2. Administrator logs in with stored credentials.
 * 3. Seller registers which auto-creates a pending approval request.
 * 4. Administrator retrieves the specific approval request using seller's ID.
 * 5. Validates request status is 'pending', rejection reason is null, and seller is correctly linked.
 */
export async function test_api_seller_approval_retrieve_pending_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registers and authenticates for administrative access
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  await authorize_admin_join(adminConnection, {
    body: { email: adminEmail, password: adminPassword },
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin-dashboard.test.com",
      referrer: "https://admin-login.test.com",
    } satisfies IEcommercePlatformAdmin.ILogin,
  });
  // 2. Seller registers their account, auto-creating a pending approval request
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await authorize_seller_join(sellerConnection, {
    body: { email: sellerEmail, password: "SecureSellerPass123" },
  });
  // 3. Administrator retrieves the specific seller approval request using seller's ID
  const request =
    await api.functional.ecommercePlatform.admin.seller_approval_requests.at(
      adminConnection,
      {
        requestId: seller.id,
      },
    );
  typia.assert(request);
  // 4. Validate that the status is 'pending', rejection reason is null, and seller is correctly linked
  TestValidator.equals("status is pending", request.status, "pending");
  TestValidator.equals("rejection reason is null", request.reason, null);
  TestValidator.equals(
    "seller association is correctly linked",
    request.seller.id,
    seller.id,
  );
}
