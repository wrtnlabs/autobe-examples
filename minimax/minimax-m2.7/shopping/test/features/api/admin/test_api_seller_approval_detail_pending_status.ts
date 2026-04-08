import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_seller_approval_detail_pending_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuthorized);
  // 2. Retrieve seller approval details with pending status
  // Using a pre-existing pending seller approval ID from the test database
  const pendingApprovalId = "00000000-0000-0000-0000-000000000001" as string &
    tags.Format<"uuid">;
  const approval =
    await api.functional.ecommerceMall.admin.admin.seller_approvals.at(
      adminConnection,
      {
        approvalId: pendingApprovalId,
      },
    );
  typia.assert(approval);
  // 3. Validate response structure and pending status
  TestValidator.equals(
    "approval ID matches request",
    approval.id,
    pendingApprovalId,
  );
  TestValidator.equals("status is pending", approval.status, "pending");
  // Seller object should be populated
  TestValidator.predicate("seller object exists", !!approval.seller);
  TestValidator.equals("seller ID exists", !!approval.seller.id, true);
  TestValidator.equals("seller email exists", !!approval.seller.email, true);
  TestValidator.equals(
    "seller approvalStatus exists",
    !!approval.seller.approvalStatus,
    true,
  );
  TestValidator.equals(
    "seller createdAt exists",
    !!approval.seller.createdAt,
    true,
  );
  // For pending approval, reviewedByAdmin should be null
  TestValidator.equals(
    "reviewedByAdmin is null for pending",
    approval.reviewedByAdmin,
    null,
  );
  // Rejection reason should be null for pending status
  TestValidator.equals(
    "rejectionReason is null for pending",
    approval.rejectionReason ?? null,
    null,
  );
  // Timestamps should exist
  TestValidator.predicate("createdAt timestamp exists", !!approval.createdAt);
  TestValidator.predicate("updatedAt timestamp exists", !!approval.updatedAt);
}
