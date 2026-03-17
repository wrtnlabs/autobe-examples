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

export async function test_api_seller_approvals_list_filtered_by_status_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register 3 sellers (all start as 'pending')
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Authorized = await authorize_seller_join(seller1Connection, {});
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Authorized = await authorize_seller_join(seller2Connection, {});
  const seller3Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller3Connection, {});
  // 3. List all approvals (unfiltered) to find the approval IDs for seller1 and seller2
  const allApprovals =
    await api.functional.shoppingMall.admin.sellerApprovals.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallSellerApproval.IRequest,
      },
    );
  typia.assert(allApprovals);
  // Find approval records for seller1 and seller2 by seller email
  const seller1Approval = allApprovals.data.find(
    (item) => item.seller.email === seller1Authorized.email,
  );
  const seller2Approval = allApprovals.data.find(
    (item) => item.seller.email === seller2Authorized.email,
  );
  TestValidator.predicate(
    "seller1 approval found",
    seller1Approval !== undefined,
  );
  TestValidator.predicate(
    "seller2 approval found",
    seller2Approval !== undefined,
  );
  // Use non-null assertion after predicate check
  const seller1ApprovalId = seller1Approval!.id;
  const seller2ApprovalId = seller2Approval!.id;
  // 4. Approve seller1
  const approvedResult =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId: seller1ApprovalId,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(approvedResult);
  // 5. Reject seller2 with a reason
  const rejectionReason = "Incomplete business documentation provided.";
  const rejectedResult =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId: seller2ApprovalId,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(rejectedResult);
  // 6. Filter by status 'pending' - verify only pending records returned
  const pendingPage =
    await api.functional.shoppingMall.admin.sellerApprovals.index(
      adminConnection,
      {
        body: {
          status: "pending",
        } satisfies IShoppingMallSellerApproval.IRequest,
      },
    );
  typia.assert(pendingPage);
  TestValidator.predicate(
    "all pending results have status pending",
    pendingPage.data.every((item) => item.status === "pending"),
  );
  TestValidator.predicate(
    "no approved items in pending results",
    pendingPage.data.every((item) => item.status !== "approved"),
  );
  TestValidator.predicate(
    "no rejected items in pending results",
    pendingPage.data.every((item) => item.status !== "rejected"),
  );
  TestValidator.predicate(
    "pending items have null reviewedAt",
    pendingPage.data.every((item) => item.reviewedAt === null),
  );
  TestValidator.predicate(
    "pending items have null rejectionReason",
    pendingPage.data.every((item) => item.rejectionReason === null),
  );
  // 7. Filter by status 'approved' - verify only approved records returned
  const approvedPage =
    await api.functional.shoppingMall.admin.sellerApprovals.index(
      adminConnection,
      {
        body: {
          status: "approved",
        } satisfies IShoppingMallSellerApproval.IRequest,
      },
    );
  typia.assert(approvedPage);
  TestValidator.predicate(
    "all approved results have status approved",
    approvedPage.data.every((item) => item.status === "approved"),
  );
  TestValidator.predicate(
    "approved items have non-null reviewedAt",
    approvedPage.data.every((item) => item.reviewedAt !== null),
  );
  // Verify the specific seller1 approval appears in approved list
  const seller1InApproved = approvedPage.data.find(
    (item) => item.seller.email === seller1Authorized.email,
  );
  TestValidator.predicate(
    "seller1 appears in approved list",
    seller1InApproved !== undefined,
  );
  // 8. Filter by status 'rejected' - verify only rejected records returned
  const rejectedPage =
    await api.functional.shoppingMall.admin.sellerApprovals.index(
      adminConnection,
      {
        body: {
          status: "rejected",
        } satisfies IShoppingMallSellerApproval.IRequest,
      },
    );
  typia.assert(rejectedPage);
  TestValidator.predicate(
    "all rejected results have status rejected",
    rejectedPage.data.every((item) => item.status === "rejected"),
  );
  TestValidator.predicate(
    "rejected items have non-null reviewedAt",
    rejectedPage.data.every((item) => item.reviewedAt !== null),
  );
  TestValidator.predicate(
    "rejected items have non-null rejectionReason",
    rejectedPage.data.every((item) => item.rejectionReason !== null),
  );
  // Verify the specific seller2 rejection appears in rejected list
  const seller2InRejected = rejectedPage.data.find(
    (item) => item.seller.email === seller2Authorized.email,
  );
  TestValidator.predicate(
    "seller2 appears in rejected list",
    seller2InRejected !== undefined,
  );
  TestValidator.predicate(
    "seller2 rejection reason matches",
    seller2InRejected?.rejectionReason === rejectionReason,
  );
}
