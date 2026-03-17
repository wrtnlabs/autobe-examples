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

export async function test_api_seller_approval_read_rejected_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller and establish seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Seller submits an approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // 3. Register a new admin and establish admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 4. As admin, retrieve pending approvals list to find the seller's approval record
  const approvalsPage =
    await api.functional.shoppingMall.admin.sellerApprovals.index(
      adminConnection,
      {
        body: {
          status: "pending",
          sellerEmail: sellerAuth.email,
        } satisfies IShoppingMallSellerApproval.IRequest,
      },
    );
  typia.assert(approvalsPage);
  // Find the specific approval record for our seller
  const approvalSummary = approvalsPage.data.find(
    (a) => a.seller.id === sellerAuth.id,
  );
  TestValidator.predicate(
    "approval record found",
    approvalSummary !== undefined,
  );
  const approvalId = approvalSummary!.id;
  // 5. As admin, reject the seller's approval with a meaningful reason
  const rejectionReason = "Incomplete shop profile information provided.";
  const rejectedApproval =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId: approvalId,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(rejectedApproval);
  // 6. As seller, retrieve the approval record
  const retrievedApproval =
    await api.functional.shoppingMall.seller.approvals.at(sellerConnection, {
      approvalId: approvalId,
    });
  typia.assert(retrievedApproval);
  // 7. Validate the retrieved approval record - business logic checks
  TestValidator.equals(
    "status is rejected",
    retrievedApproval.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection_reason matches",
    retrievedApproval.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewed_at is non-null",
    retrievedApproval.reviewed_at !== null,
  );
  TestValidator.predicate(
    "reviewed_by is non-null",
    retrievedApproval.reviewed_by !== null,
  );
  TestValidator.equals(
    "seller id matches",
    retrievedApproval.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "submitted_at unchanged",
    retrievedApproval.submitted_at,
    approval.submitted_at,
  );
  // Validate reviewer info contains the reviewing admin's details
  if (retrievedApproval.reviewed_by !== null) {
    TestValidator.equals(
      "reviewer id matches admin",
      retrievedApproval.reviewed_by.id,
      adminAuth.id,
    );
    TestValidator.equals(
      "reviewer email matches admin",
      retrievedApproval.reviewed_by.email,
      adminAuth.email,
    );
  }
}
