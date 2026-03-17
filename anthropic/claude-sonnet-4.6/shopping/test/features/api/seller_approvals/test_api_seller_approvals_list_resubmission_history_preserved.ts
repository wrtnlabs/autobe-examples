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

export async function test_api_seller_approvals_list_resubmission_history_preserved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Admin joins
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Setup: Seller joins — auto-creates first SellerApproval with 'pending' status
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuthorized);
  const sellerId = sellerAuthorized.id;
  // 3. As admin, list all seller approvals to find the seller's first pending approval record
  const initialList =
    await api.functional.shoppingMall.admin.sellerApprovals.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallSellerApproval.IRequest,
      },
    );
  typia.assert(initialList);
  // Find the pending approval record for our seller
  const firstApproval = initialList.data.find(
    (record) => record.seller.id === sellerId && record.status === "pending",
  );
  TestValidator.predicate(
    "first approval record found for seller",
    firstApproval !== undefined,
  );
  const firstApprovalId = firstApproval!.id;
  // 4. As admin, reject the seller's first approval
  const rejectedApproval =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId: firstApprovalId,
        body: {
          status: "rejected",
          rejection_reason: "Incomplete documentation provided",
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(rejectedApproval);
  TestValidator.equals(
    "first approval status is rejected",
    rejectedApproval.status,
    "rejected",
  );
  // 5. As the seller, resubmit a new approval request
  // sellerConnection already has the Bearer token from the join step
  const resubmittedApproval =
    await generate_random_shopping_mall_seller_approvals_create(
      sellerConnection,
      { body: {} },
    );
  typia.assert(resubmittedApproval);
  TestValidator.equals(
    "resubmitted approval status is pending",
    resubmittedApproval.status,
    "pending",
  );
  // 6. As admin, list all seller approvals with no filters
  const allApprovalsList =
    await api.functional.shoppingMall.admin.sellerApprovals.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallSellerApproval.IRequest,
      },
    );
  typia.assert(allApprovalsList);
  // 7. Validate: pagination.records is at least 2
  TestValidator.predicate(
    "total records is at least 2",
    allApprovalsList.pagination.records >= 2,
  );
  // Find all approval entries for our seller
  const sellerApprovalEntries = allApprovalsList.data.filter(
    (record) => record.seller.id === sellerId,
  );
  TestValidator.predicate(
    "two approval entries exist for the same seller",
    sellerApprovalEntries.length === 2,
  );
  // Find the rejected entry and the new pending entry
  const rejectedEntry = sellerApprovalEntries.find(
    (record) => record.status === "rejected",
  );
  const pendingEntry = sellerApprovalEntries.find(
    (record) => record.status === "pending",
  );
  TestValidator.predicate("rejected entry exists", rejectedEntry !== undefined);
  TestValidator.predicate(
    "pending (resubmission) entry exists",
    pendingEntry !== undefined,
  );
  // Validate rejected entry has non-null rejectionReason and non-null reviewedAt
  TestValidator.predicate(
    "rejected entry has non-null rejectionReason",
    rejectedEntry!.rejectionReason !== null,
  );
  TestValidator.predicate(
    "rejected entry has non-null reviewedAt",
    rejectedEntry!.reviewedAt !== null,
  );
  // Validate pending entry has null reviewedAt and null rejectionReason
  TestValidator.equals(
    "pending entry has null reviewedAt",
    pendingEntry!.reviewedAt,
    null,
  );
  TestValidator.equals(
    "pending entry has null rejectionReason",
    pendingEntry!.rejectionReason,
    null,
  );
  // Validate the two records have different IDs
  TestValidator.notEquals(
    "two records have different IDs",
    rejectedEntry!.id,
    pendingEntry!.id,
  );
  // Validate the pending resubmission record has a later submittedAt timestamp
  TestValidator.predicate(
    "pending record has later submittedAt than rejected record",
    new Date(pendingEntry!.submittedAt) > new Date(rejectedEntry!.submittedAt),
  );
  // Optional: filter by sellerEmail and verify both records appear
  const filteredList =
    await api.functional.shoppingMall.admin.sellerApprovals.index(
      adminConnection,
      {
        body: {
          sellerEmail: sellerEmail,
        } satisfies IShoppingMallSellerApproval.IRequest,
      },
    );
  typia.assert(filteredList);
  const filteredSellerEntries = filteredList.data.filter(
    (record) => record.seller.id === sellerId,
  );
  TestValidator.predicate(
    "filtered by email returns both records for seller",
    filteredSellerEntries.length === 2,
  );
  const filteredRejected = filteredSellerEntries.find(
    (record) => record.status === "rejected",
  );
  const filteredPending = filteredSellerEntries.find(
    (record) => record.status === "pending",
  );
  TestValidator.predicate(
    "filtered result contains rejected entry",
    filteredRejected !== undefined,
  );
  TestValidator.predicate(
    "filtered result contains pending entry",
    filteredPending !== undefined,
  );
}
