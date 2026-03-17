import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApproval";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
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

export async function test_api_seller_approval_admin_retrieves_rejected_record_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create new admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller setup - create new seller connection and register (auto-creates pending approval)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
    },
  });
  typia.assert(sellerAuthorized);
  // 3. As admin, list seller approvals to find the pending approval for our seller
  const approvalsPage =
    await api.functional.shoppingMall.admin.sellerApprovals.index(
      adminConnection,
      {
        body: {
          sellerEmail: sellerEmail,
          status: "pending",
        } satisfies IShoppingMallSellerApproval.IRequest,
      },
    );
  typia.assert(approvalsPage);
  // Find the approval record for our newly registered seller
  const pendingApproval = approvalsPage.data.find(
    (item) => item.seller.email === sellerEmail,
  );
  TestValidator.predicate(
    "pending approval exists",
    pendingApproval !== undefined,
  );
  const approvalId = pendingApproval!.id;
  // 4. As admin, reject the pending seller approval with a reason
  const rejectionReason = "Incomplete business information provided";
  const rejectedApproval =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(rejectedApproval);
  // 5. Primary Test: As admin, retrieve the rejected approval record
  const retrieved = await api.functional.shoppingMall.admin.sellerApprovals.at(
    adminConnection,
    {
      approvalId,
    },
  );
  typia.assert(retrieved);
  // 6. Assert status is 'rejected'
  TestValidator.equals("status is rejected", retrieved.status, "rejected");
  // 7. Assert rejection_reason is non-null and matches the provided reason
  TestValidator.predicate(
    "rejection_reason is non-null",
    retrieved.rejection_reason !== null,
  );
  TestValidator.equals(
    "rejection_reason matches",
    retrieved.rejection_reason,
    rejectionReason,
  );
  // 8. Assert reviewed_at is non-null (decision was recorded)
  TestValidator.predicate(
    "reviewed_at is non-null",
    retrieved.reviewed_at !== null,
  );
  // 9. Assert reviewed_by is non-null (reviewing admin info present)
  TestValidator.predicate(
    "reviewed_by is non-null",
    retrieved.reviewed_by !== null,
  );
  // 10. Assert seller account flags: rejection does not ban or suspend the seller
  TestValidator.equals(
    "seller.isBanned is false",
    retrieved.seller.isBanned,
    false,
  );
  TestValidator.equals(
    "seller.isSuspended is false",
    retrieved.seller.isSuspended,
    false,
  );
  // 11. Assert chronological integrity: submitted_at <= reviewed_at
  const submittedAt = new Date(retrieved.submitted_at).getTime();
  const reviewedAt = new Date(retrieved.reviewed_at!).getTime();
  TestValidator.predicate(
    "submitted_at is before or equal to reviewed_at",
    submittedAt <= reviewedAt,
  );
}
