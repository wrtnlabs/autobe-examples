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
import { generate_random_shopping_mall_seller_approvals_create } from "../../../generate/generate_random_shopping_mall_seller_approvals_create";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_seller_approvals_list_history_after_rejection_and_resubmission(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Step 2: Submit the initial seller approval request
  const firstApproval =
    await generate_random_shopping_mall_seller_approvals_create(
      sellerConnection,
      { body: {} satisfies IShoppingMallSellerApproval.ICreate },
    );
  typia.assert(firstApproval);
  TestValidator.equals(
    "first approval status is pending",
    firstApproval.status,
    "pending",
  );
  // Step 3: Register an admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // Step 4: Admin retrieves list of pending approvals to find the seller's approval ID
  const adminApprovalList =
    await api.functional.shoppingMall.admin.sellerApprovals.index(
      adminConnection,
      {
        body: {
          status: "pending",
        } satisfies IShoppingMallSellerApproval.IRequest,
      },
    );
  typia.assert(adminApprovalList);
  // Find the specific approval for our seller
  const pendingApproval = adminApprovalList.data.find(
    (a) => a.seller.id === sellerAuth.seller.id,
  );
  TestValidator.predicate(
    "pending approval found for seller",
    pendingApproval !== undefined,
  );
  const approvalId = pendingApproval!.id;
  // Step 5: Admin rejects the seller's approval with a rejection reason
  const rejectionReason =
    "Your shop information is incomplete. Please provide more details.";
  const rejectedApproval =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason as string & tags.MinLength<1>,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(rejectedApproval);
  TestValidator.equals(
    "approval status is rejected",
    rejectedApproval.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    rejectedApproval.rejection_reason,
    rejectionReason,
  );
  // Step 6: Seller resubmits a new approval request after rejection
  const secondApproval =
    await generate_random_shopping_mall_seller_approvals_create(
      sellerConnection,
      { body: {} satisfies IShoppingMallSellerApproval.ICreate },
    );
  typia.assert(secondApproval);
  TestValidator.equals(
    "second approval status is pending",
    secondApproval.status,
    "pending",
  );
  // Step 7: Seller calls PATCH /shoppingMall/seller/approvals with no filters
  const sellerHistory =
    await api.functional.shoppingMall.seller.approvals.index(sellerConnection, {
      body: {} satisfies IShoppingMallSellerApproval.IRequest,
    });
  typia.assert(sellerHistory);
  // Step 8: Verify the response data array contains at least 2 records
  TestValidator.predicate(
    "at least 2 records in history",
    sellerHistory.data.length >= 2,
  );
  // Step 11: Verify pagination metadata shows records >= 2
  TestValidator.predicate(
    "pagination records count >= 2",
    sellerHistory.pagination.records >= 2,
  );
  // Find the rejected record and the new pending record
  const rejectedRecord = sellerHistory.data.find(
    (a) => a.status === "rejected",
  );
  const pendingRecord = sellerHistory.data.find((a) => a.status === "pending");
  TestValidator.predicate(
    "rejected record exists in history",
    rejectedRecord !== undefined,
  );
  TestValidator.predicate(
    "pending record exists in history",
    pendingRecord !== undefined,
  );
  // Step 9: Verify rejected record has rejectionReason and reviewedAt populated
  TestValidator.equals(
    "rejected record has correct rejection reason",
    rejectedRecord!.rejectionReason,
    rejectionReason,
  );
  TestValidator.predicate(
    "rejected record has reviewedAt not null",
    rejectedRecord!.reviewedAt !== null,
  );
  // Step 10: Verify new pending record has reviewedAt=null and rejectionReason=null
  TestValidator.equals(
    "pending record has null rejectionReason",
    pendingRecord!.rejectionReason,
    null,
  );
  TestValidator.equals(
    "pending record has null reviewedAt",
    pendingRecord!.reviewedAt,
    null,
  );
  // Step 12: Verify default sort order: most recently submitted first (pending before rejected)
  const pendingIndex = sellerHistory.data.findIndex(
    (a) => a.status === "pending",
  );
  const rejectedIndex = sellerHistory.data.findIndex(
    (a) => a.status === "rejected",
  );
  TestValidator.predicate(
    "pending record appears before rejected record (most recent first)",
    pendingIndex < rejectedIndex,
  );
}
