import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerApproval";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator pending seller approval pagination functionality.
 *
 * Validates the paginated listing of seller registration approval requests with pending status. Ensures administrators can properly browse the approval queue with pagination controls and filtering.
 *
 * The test verifies that only pending approval requests are returned, pagination metadata is accurate, and results are sorted by creation timestamp in descending order.
 *
 * 1. Administrator authenticates via admin join endpoint.
 * 2. Administrator calls pending approvals endpoint with pagination parameters.
 * 3. Validates response structure includes pagination metadata and approval summaries.
 * 4. Verifies all returned approvals have 'pending' status.
 * 5. Confirms pagination metadata contains correct current page, limit, records, and pages.
 * 6. Validates each approval summary contains required seller information.
 * 7. Tests sorting order by created_at descending.
 * 8. Verifies approved and rejected approvals are excluded from pending results.
 */
export async function test_api_admin_pending_approvals_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Call pending approvals endpoint with pagination
  const page = 1;
  const limit = 10;
  const approvals =
    await api.functional.ecommerce.admin.approvals.pending.index(
      adminConnection,
      {
        body: {
          page,
          limit,
          status: "pending",
        } satisfies IEcommerceSellerApproval.IRequest,
      },
    );
  typia.assert(approvals);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    approvals.pagination.current,
    page,
  );
  TestValidator.equals("pagination limit", approvals.pagination.limit, limit);
  TestValidator.predicate(
    "pagination records non-negative",
    approvals.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    approvals.pagination.pages >= 0,
  );
  // 4. Validate all approvals have pending status
  await TestValidator.predicate(
    "all approvals have pending status",
    approvals.data.every((approval) => approval.status === "pending"),
  );
  // 5. Validate approval summary structure
  await TestValidator.predicate(
    "approvals have required fields",
    approvals.data.every((approval) => {
      return (
        approval.id !== undefined &&
        approval.seller !== undefined &&
        approval.seller.id !== undefined &&
        approval.seller.shop_name !== undefined &&
        approval.created_at !== undefined
      );
    }),
  );
  // 6. Validate seller information in each approval
  await TestValidator.predicate(
    "seller information complete",
    approvals.data.every((approval) => {
      const seller = approval.seller;
      return (
        seller.approval_status !== undefined &&
        seller.shop_name !== undefined &&
        seller.created_at !== undefined
      );
    }),
  );
  // 7. Test sorting order by created_at descending (newest first)
  if (approvals.data.length > 1) {
    await TestValidator.predicate(
      "results sorted by created_at descending",
      approvals.data.every((approval, index) => {
        if (index === 0) return true;
        const previous = approvals.data[index - 1];
        return (
          new Date(approval.created_at).getTime() <=
          new Date(previous.created_at).getTime()
        );
      }),
    );
  }
  // 8. Test with different pagination parameters
  const page2 = 2;
  const limit2 = 5;
  const approvalsPage2 =
    await api.functional.ecommerce.admin.approvals.pending.index(
      adminConnection,
      {
        body: {
          page: page2,
          limit: limit2,
          status: "pending",
        } satisfies IEcommerceSellerApproval.IRequest,
      },
    );
  typia.assert(approvalsPage2);
  TestValidator.equals(
    "page 2 current page",
    approvalsPage2.pagination.current,
    page2,
  );
  TestValidator.equals("page 2 limit", approvalsPage2.pagination.limit, limit2);
  // 9. Verify approved and rejected statuses are excluded
  // When filtering by pending status, only pending approvals should be returned
  await TestValidator.predicate(
    "approved approvals excluded from pending results",
    approvals.data.every((approval) => approval.status !== "approved"),
  );
  await TestValidator.predicate(
    "rejected approvals excluded from pending results",
    approvals.data.every((approval) => approval.status !== "rejected"),
  );
}
