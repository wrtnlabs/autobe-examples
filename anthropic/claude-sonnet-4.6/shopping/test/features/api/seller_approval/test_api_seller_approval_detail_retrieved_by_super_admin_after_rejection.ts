import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApproval";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_seller_approval_detail_retrieved_by_super_admin_after_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super admin and obtain JWT (connection updated internally)
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Register a new seller (creates a pending SellerApproval automatically)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. List seller approvals as superAdmin to find the pending approval for this seller
  const approvalsPage =
    await api.functional.shoppingMall.superAdmin.sellerApprovals.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          sellerEmail: sellerAuth.email,
        } satisfies IShoppingMallSellerApproval.IRequest,
      },
    );
  typia.assert(approvalsPage);
  // Find the pending approval for the newly registered seller
  const pendingApproval = approvalsPage.data.find(
    (a) => a.seller.email === sellerAuth.email && a.status === "pending",
  );
  TestValidator.predicate(
    "pending approval found",
    pendingApproval !== undefined,
  );
  const approvalId = pendingApproval!.id;
  // 4. Reject the pending seller approval with a reason
  const rejectionReason = "Incomplete shop information provided.";
  const rejectedApproval =
    await api.functional.shoppingMall.superAdmin.sellerApprovals.update(
      superAdminConnection,
      {
        approvalId,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(rejectedApproval);
  // 5. Retrieve the rejected approval detail via GET
  const detail =
    await api.functional.shoppingMall.superAdmin.sellerApprovals.at(
      superAdminConnection,
      {
        approvalId,
      },
    );
  typia.assert(detail);
  // Validate: id matches
  TestValidator.equals("approval id matches", detail.id, approvalId);
  // Validate: status is 'rejected'
  TestValidator.equals("status is rejected", detail.status, "rejected");
  // Validate: seller is present and matches
  TestValidator.predicate(
    "seller is non-null",
    detail.seller !== null && detail.seller !== undefined,
  );
  TestValidator.equals(
    "seller email matches",
    detail.seller.email,
    sellerAuth.email,
  );
  // Validate: rejection_reason is populated and matches
  TestValidator.predicate(
    "rejection_reason is non-null",
    detail.rejection_reason !== null,
  );
  TestValidator.equals(
    "rejection_reason matches",
    detail.rejection_reason,
    rejectionReason,
  );
  // Validate: reviewed_at is non-null
  TestValidator.predicate(
    "reviewed_at is non-null",
    detail.reviewed_at !== null,
  );
  // Validate: reviewed_by is non-null and has grade 'super'
  TestValidator.predicate(
    "reviewed_by is non-null",
    detail.reviewed_by !== null,
  );
  TestValidator.equals(
    "reviewed_by grade is super",
    detail.reviewed_by!.grade,
    "super",
  );
  // Validate: submitted_at is present (immutable after creation)
  TestValidator.predicate(
    "submitted_at is non-null",
    detail.submitted_at !== null && detail.submitted_at !== undefined,
  );
  // Validate: created_at and updated_at are present
  TestValidator.predicate(
    "created_at is non-null",
    detail.created_at !== null && detail.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is non-null",
    detail.updated_at !== null && detail.updated_at !== undefined,
  );
}
