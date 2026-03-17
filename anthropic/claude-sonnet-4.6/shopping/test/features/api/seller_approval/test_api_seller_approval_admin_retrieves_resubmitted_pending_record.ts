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

export async function test_api_seller_approval_admin_retrieves_resubmitted_pending_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register seller (auto-creates first pending approval)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. As admin, list approvals to find the first approval record
  const firstList =
    await api.functional.shoppingMall.admin.sellerApprovals.index(
      adminConnection,
      {
        body: {
          status: "pending",
          sellerEmail: sellerEmail,
        } satisfies IShoppingMallSellerApproval.IRequest,
      },
    );
  typia.assert(firstList);
  TestValidator.predicate(
    "first list has at least one record",
    firstList.data.length > 0,
  );
  const firstApprovalSummary = firstList.data[0]!;
  const firstApprovalId = firstApprovalSummary.id;
  // 4. As admin, reject the first approval
  const rejectedApproval =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId: firstApprovalId,
        body: {
          status: "rejected",
          rejection_reason: "Insufficient documentation provided.",
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(rejectedApproval);
  TestValidator.equals(
    "first approval status is rejected after update",
    rejectedApproval.status,
    "rejected",
  );
  // 5. As seller, resubmit a new seller approval request
  const newApproval =
    await generate_random_shopping_mall_seller_approvals_create(
      sellerConnection,
      {},
    );
  typia.assert(newApproval);
  // 6. As admin, list approvals again to find the new pending record for this seller
  const secondList =
    await api.functional.shoppingMall.admin.sellerApprovals.index(
      adminConnection,
      {
        body: {
          status: "pending",
          sellerEmail: sellerEmail,
        } satisfies IShoppingMallSellerApproval.IRequest,
      },
    );
  typia.assert(secondList);
  TestValidator.predicate(
    "second list has at least one pending record",
    secondList.data.length > 0,
  );
  const newApprovalSummary = secondList.data[0]!;
  const newApprovalId = newApprovalSummary.id;
  // Confirm the new record is different from the first
  TestValidator.notEquals(
    "new approval id differs from first",
    newApprovalId,
    firstApprovalId,
  );
  // 7. GET the new (resubmitted) approval record as admin
  const retrievedNewApproval =
    await api.functional.shoppingMall.admin.sellerApprovals.at(
      adminConnection,
      {
        approvalId: newApprovalId,
      },
    );
  typia.assert(retrievedNewApproval);
  // Assert new record properties
  TestValidator.equals(
    "new approval status is pending",
    retrievedNewApproval.status,
    "pending",
  );
  TestValidator.equals(
    "new approval reviewed_at is null",
    retrievedNewApproval.reviewed_at,
    null,
  );
  TestValidator.equals(
    "new approval rejection_reason is null",
    retrievedNewApproval.rejection_reason,
    null,
  );
  TestValidator.equals(
    "new approval reviewed_by is null",
    retrievedNewApproval.reviewed_by,
    null,
  );
  // Assert new record submitted_at is later than first record's submitted_at
  const firstSubmittedAt = new Date(firstApprovalSummary.submittedAt).getTime();
  const newSubmittedAt = new Date(retrievedNewApproval.submitted_at).getTime();
  TestValidator.predicate(
    "new approval submitted_at is later than first approval submitted_at",
    newSubmittedAt >= firstSubmittedAt,
  );
  // 8. GET the first (rejected) approval record as admin
  const retrievedFirstApproval =
    await api.functional.shoppingMall.admin.sellerApprovals.at(
      adminConnection,
      {
        approvalId: firstApprovalId,
      },
    );
  typia.assert(retrievedFirstApproval);
  // Assert historical record integrity
  TestValidator.equals(
    "first approval status is still rejected",
    retrievedFirstApproval.status,
    "rejected",
  );
  TestValidator.predicate(
    "first approval rejection_reason is non-null",
    retrievedFirstApproval.rejection_reason !== null,
  );
  TestValidator.predicate(
    "first approval reviewed_at is non-null",
    retrievedFirstApproval.reviewed_at !== null,
  );
}
