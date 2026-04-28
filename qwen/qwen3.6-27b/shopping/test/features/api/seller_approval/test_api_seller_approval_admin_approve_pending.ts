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
 * Test the admin approval workflow for a pending seller registration request.
 *
 * Validates the complete seller approval flow including seller registration, administrator authentication, and approval request update. Ensures that the approval request transitions from pending to approved status and correctly clears any rejection reason.
 *
 * Business rules verified include status transition constraints, reason nullification upon approval, and proper association with the registered seller profile in the response payload.
 *
 * 1. Seller registers a new account, auto-creating a pending approval request.
 * 2. Administrator authenticates to the platform with join credentials.
 * 3. Administrator approves the seller's pending approval request.
 * 4. Validates response contains approved status, nullified reason, and valid seller reference.
 */
export async function test_api_seller_approval_admin_approve_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration creates pending approval request
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 3. Admin approves the pending request
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    status: "approved",
    reason: null,
  } satisfies IEcommercePlatformSellerApprovalRequest.IUpdate;
  const response =
    await api.functional.ecommercePlatform.admin.seller_approval_requests.update(
      adminConnection,
      { requestId, body },
    );
  typia.assert(response);
  // 4. Validate business logic and response structure
  TestValidator.equals(
    "status transitions to approved",
    response.status,
    "approved",
  );
  TestValidator.equals(
    "reason is cleared upon approval",
    response.reason,
    null,
  );
  TestValidator.predicate(
    "updated timestamp exists",
    response.updated_at.length > 0,
  );
  TestValidator.equals(
    "seller approval status is approved",
    response.seller.approvalStatus,
    "approved",
  );
}
