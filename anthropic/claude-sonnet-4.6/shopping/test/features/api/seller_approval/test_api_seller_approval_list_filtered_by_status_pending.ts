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

export async function test_api_seller_approval_list_filtered_by_status_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super admin and create authenticated connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Register seller 1 (will be approved)
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const sellerConnection1: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection1, {
    body: {
      email: seller1Email,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 3. Register seller 2 (will remain pending)
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const sellerConnection2: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection2, {
    body: {
      email: seller2Email,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 4. Find seller1's approval record via pending filter
  const allPending =
    await api.functional.shoppingMall.superAdmin.sellerApprovals.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          sellerEmail: seller1Email,
        } satisfies IShoppingMallSellerApproval.IRequest,
      },
    );
  typia.assert(allPending);
  TestValidator.predicate(
    "seller1 approval found",
    allPending.data.length >= 1,
  );
  const seller1Approval = allPending.data.find(
    (item) => item.seller.email === seller1Email,
  );
  TestValidator.predicate(
    "seller1 approval exists",
    seller1Approval !== undefined,
  );
  // 5. Approve seller1's registration
  const updatedApproval =
    await api.functional.shoppingMall.superAdmin.sellerApprovals.update(
      superAdminConnection,
      {
        approvalId: seller1Approval!.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(updatedApproval);
  TestValidator.equals(
    "approval status is approved",
    updatedApproval.status,
    "approved",
  );
  // === Test Case 1: Filter by 'pending' status ===
  const pendingResult =
    await api.functional.shoppingMall.superAdmin.sellerApprovals.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
        } satisfies IShoppingMallSellerApproval.IRequest,
      },
    );
  typia.assert(pendingResult);
  // All items must have status 'pending'
  for (const item of pendingResult.data) {
    TestValidator.equals("item status is pending", item.status, "pending");
  }
  // Seller1 (approved) must NOT appear in pending results
  const approvedSellerInPending = pendingResult.data.find(
    (item) => item.seller.email === seller1Email,
  );
  TestValidator.predicate(
    "approved seller not in pending results",
    approvedSellerInPending === undefined,
  );
  // Seller2 (pending) MUST appear in pending results
  const pendingSellerInPending = pendingResult.data.find(
    (item) => item.seller.email === seller2Email,
  );
  TestValidator.predicate(
    "pending seller appears in pending results",
    pendingSellerInPending !== undefined,
  );
  // === Test Case 2: Filter by 'approved' status ===
  const approvedResult =
    await api.functional.shoppingMall.superAdmin.sellerApprovals.index(
      superAdminConnection,
      {
        body: {
          status: "approved",
        } satisfies IShoppingMallSellerApproval.IRequest,
      },
    );
  typia.assert(approvedResult);
  // All items must have status 'approved'
  for (const item of approvedResult.data) {
    TestValidator.equals("item status is approved", item.status, "approved");
  }
  // Find seller1's approved record, verify reviewedAt is non-null and rejectionReason is null
  const seller1ApprovedItem = approvedResult.data.find(
    (item) => item.seller.email === seller1Email,
  );
  TestValidator.predicate(
    "seller1 appears in approved results",
    seller1ApprovedItem !== undefined,
  );
  TestValidator.predicate(
    "approved record has non-null reviewedAt",
    seller1ApprovedItem!.reviewedAt !== null,
  );
  TestValidator.equals(
    "approved record rejectionReason is null",
    seller1ApprovedItem!.rejectionReason,
    null,
  );
  // === Test Case 3: Filter by sellerEmail (exact match, should also work for full email) ===
  const emailSearchResult =
    await api.functional.shoppingMall.superAdmin.sellerApprovals.index(
      superAdminConnection,
      {
        body: {
          sellerEmail: seller2Email,
        } satisfies IShoppingMallSellerApproval.IRequest,
      },
    );
  typia.assert(emailSearchResult);
  // All returned records must include the email string (case-insensitive)
  for (const item of emailSearchResult.data) {
    TestValidator.predicate(
      "email search result matches",
      item.seller.email.toLowerCase().includes(seller2Email.toLowerCase()),
    );
  }
  // Seller2 must appear in email search results
  const seller2InEmailSearch = emailSearchResult.data.find(
    (item) => item.seller.email === seller2Email,
  );
  TestValidator.predicate(
    "seller2 found via email search",
    seller2InEmailSearch !== undefined,
  );
  // === Test Case 4: Pagination behavior ===
  // Get total count of all records first
  const allRecords =
    await api.functional.shoppingMall.superAdmin.sellerApprovals.index(
      superAdminConnection,
      {
        body: {} satisfies IShoppingMallSellerApproval.IRequest,
      },
    );
  typia.assert(allRecords);
  const totalRecords = allRecords.pagination.records;
  // Now paginate with limit=1
  const pageResult =
    await api.functional.shoppingMall.superAdmin.sellerApprovals.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallSellerApproval.IRequest,
      },
    );
  typia.assert(pageResult);
  // Exactly 1 record per page
  TestValidator.equals("page data has 1 item", pageResult.data.length, 1);
  TestValidator.equals("pagination limit is 1", pageResult.pagination.limit, 1);
  TestValidator.equals(
    "pagination current page is 1",
    pageResult.pagination.current,
    1,
  );
  // Pages = ceil(totalRecords / 1) = totalRecords
  TestValidator.equals(
    "pagination total pages matches record count",
    pageResult.pagination.pages,
    totalRecords,
  );
}
