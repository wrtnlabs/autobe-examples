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
import { generate_random_shopping_mall_seller_approvals_create } from "../../../generate/generate_random_shopping_mall_seller_approvals_create";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_seller_approval_list_resubmission_history_preserved(
  connection: api.IConnection,
): Promise<void> {
  // ─── 1. Setup: Register super admin ───────────────────────────────────────
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // ─── 2. Setup: Register seller (auto-creates first pending SellerApproval) ─
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  // ─── 3. Find the first pending approval for this seller ───────────────────
  const pendingListPage =
    await api.functional.shoppingMall.superAdmin.sellerApprovals.index(
      superAdminConnection,
      {
        body: {
          sellerEmail: sellerEmail,
          status: "pending",
        } satisfies IShoppingMallSellerApproval.IRequest,
      },
    );
  typia.assert(pendingListPage);
  TestValidator.predicate(
    "initial pending approval exists",
    pendingListPage.data.length >= 1,
  );
  const firstApproval = pendingListPage.data.find(
    (r) => r.seller.id === sellerId && r.status === "pending",
  );
  TestValidator.predicate(
    "first pending approval found for seller",
    firstApproval !== undefined,
  );
  const firstApprovalId = firstApproval!.id;
  // ─── 4. Reject the seller's first approval ────────────────────────────────
  const rejectionReason =
    "Documentation is incomplete. Please resubmit with all required documents.";
  const rejectedApproval =
    await api.functional.shoppingMall.superAdmin.sellerApprovals.update(
      superAdminConnection,
      {
        approvalId: firstApprovalId,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(rejectedApproval);
  TestValidator.equals(
    "first approval status is rejected",
    rejectedApproval.status,
    "rejected",
  );
  TestValidator.predicate(
    "reviewed_at is non-null after rejection",
    rejectedApproval.reviewed_at !== null,
  );
  TestValidator.predicate(
    "rejection_reason contains the provided text",
    rejectedApproval.rejection_reason !== null &&
      rejectedApproval.rejection_reason.includes("Documentation is incomplete"),
  );
  // ─── 5. Seller resubmits a new approval request ──────────────────────────
  const newApproval =
    await generate_random_shopping_mall_seller_approvals_create(
      sellerConnection,
      { body: {} },
    );
  typia.assert(newApproval);
  TestValidator.equals(
    "new approval status is pending",
    newApproval.status,
    "pending",
  );
  TestValidator.predicate(
    "new approval reviewed_at is null",
    newApproval.reviewed_at === null,
  );
  TestValidator.predicate(
    "new approval rejection_reason is null",
    newApproval.rejection_reason === null,
  );
  // ─── 6. Verify resubmission history: both records appear in the full list ──
  const allApprovalsPage =
    await api.functional.shoppingMall.superAdmin.sellerApprovals.index(
      superAdminConnection,
      {
        body: {
          sellerEmail: sellerEmail,
        } satisfies IShoppingMallSellerApproval.IRequest,
      },
    );
  typia.assert(allApprovalsPage);
  const sellerRecords = allApprovalsPage.data.filter(
    (r) => r.seller.id === sellerId,
  );
  TestValidator.predicate(
    "seller appears TWICE (resubmission history not deduplicated)",
    sellerRecords.length >= 2,
  );
  const rejectedRecord = sellerRecords.find((r) => r.status === "rejected");
  const pendingRecord = sellerRecords.find((r) => r.status === "pending");
  TestValidator.predicate(
    "rejected record exists in history",
    rejectedRecord !== undefined,
  );
  TestValidator.predicate(
    "pending record exists in history",
    pendingRecord !== undefined,
  );
  // Verify rejected record fields
  TestValidator.equals(
    "rejected record status",
    rejectedRecord!.status,
    "rejected",
  );
  TestValidator.predicate(
    "rejected record reviewedAt is non-null",
    rejectedRecord!.reviewedAt !== null,
  );
  TestValidator.predicate(
    "rejected record rejectionReason contains rejection text",
    rejectedRecord!.rejectionReason !== null &&
      rejectedRecord!.rejectionReason.includes("Documentation is incomplete"),
  );
  // Verify pending record fields
  TestValidator.equals(
    "pending record status",
    pendingRecord!.status,
    "pending",
  );
  TestValidator.predicate(
    "pending record reviewedAt is null",
    pendingRecord!.reviewedAt === null,
  );
  TestValidator.predicate(
    "pending record rejectionReason is null",
    pendingRecord!.rejectionReason === null,
  );
  // Verify both records reference the same seller
  TestValidator.equals(
    "rejected record seller.id matches",
    rejectedRecord!.seller.id,
    sellerId,
  );
  TestValidator.equals(
    "pending record seller.id matches",
    pendingRecord!.seller.id,
    sellerId,
  );
  // ─── 7. Filter: status=rejected returns only rejected ─────────────────────
  const rejectedFilterPage =
    await api.functional.shoppingMall.superAdmin.sellerApprovals.index(
      superAdminConnection,
      {
        body: {
          sellerEmail: sellerEmail,
          status: "rejected",
        } satisfies IShoppingMallSellerApproval.IRequest,
      },
    );
  typia.assert(rejectedFilterPage);
  const rejectedFiltered = rejectedFilterPage.data.filter(
    (r) => r.seller.id === sellerId,
  );
  TestValidator.predicate(
    "rejected filter returns rejected records only",
    rejectedFiltered.every((r) => r.status === "rejected"),
  );
  TestValidator.predicate(
    "rejected filter returns at least one rejected record for seller",
    rejectedFiltered.length >= 1,
  );
  // ─── 8. Filter: status=pending returns only pending ──────────────────────
  const pendingFilterPage =
    await api.functional.shoppingMall.superAdmin.sellerApprovals.index(
      superAdminConnection,
      {
        body: {
          sellerEmail: sellerEmail,
          status: "pending",
        } satisfies IShoppingMallSellerApproval.IRequest,
      },
    );
  typia.assert(pendingFilterPage);
  const pendingFiltered = pendingFilterPage.data.filter(
    (r) => r.seller.id === sellerId,
  );
  TestValidator.predicate(
    "pending filter returns pending records only",
    pendingFiltered.every((r) => r.status === "pending"),
  );
  TestValidator.predicate(
    "pending filter returns at least one pending record for seller",
    pendingFiltered.length >= 1,
  );
  // ─── 9. Sort: default (submittedAt:desc) → newer pending before older rejected ─
  const sortedPage =
    await api.functional.shoppingMall.superAdmin.sellerApprovals.index(
      superAdminConnection,
      {
        body: {
          sellerEmail: sellerEmail,
        } satisfies IShoppingMallSellerApproval.IRequest,
      },
    );
  typia.assert(sortedPage);
  const sortedSellerRecords = sortedPage.data.filter(
    (r) => r.seller.id === sellerId,
  );
  TestValidator.predicate(
    "at least two records for sort check",
    sortedSellerRecords.length >= 2,
  );
  // The newest (pending) record should appear before the older (rejected) record
  const firstInSorted = sortedSellerRecords[0];
  const secondInSorted = sortedSellerRecords[1];
  TestValidator.equals(
    "first record in sorted list is the newer pending",
    firstInSorted!.status,
    "pending",
  );
  TestValidator.equals(
    "second record in sorted list is the older rejected",
    secondInSorted!.status,
    "rejected",
  );
}
