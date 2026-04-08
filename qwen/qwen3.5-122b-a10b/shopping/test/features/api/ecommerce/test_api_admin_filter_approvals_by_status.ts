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
 * Test administrator filtering of seller approval requests by status.
 *
 * Validates that administrators can filter seller approval requests by their workflow status (pending, approved, rejected) and receive only matching records. This ensures the approval management system correctly separates requests by their current state and provides accurate filtering for administrative review workflows.
 *
 * The test authenticates as an administrator, then performs three separate queries filtering by each status value. For each query, it validates that the returned results contain only approvals matching the requested status and that the pagination metadata is accurate.
 *
 * 1. Administrator registers and authenticates to access approval management features.
 * 2. Query approvals with status="pending" and validate only pending requests are returned.
 * 3. Query approvals with status="approved" and validate only approved requests are returned.
 * 4. Query approvals with status="rejected" and validate only rejected requests with rejection_reason populated are returned.
 * 5. Validate pagination metadata (current page, limit, records count, total pages) for each query.
 */
export async function test_api_admin_filter_approvals_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Query pending approvals
  const pendingResult = await api.functional.ecommerce.admin.approvals.index(
    adminConnection,
    {
      body: {
        status: "pending",
        page: 1,
        limit: 20,
      } satisfies IEcommerceSellerApproval.IRequest,
    },
  );
  typia.assert(pendingResult);
  // Validate pending results
  TestValidator.predicate(
    "pending filter returns only pending status",
    pendingResult.data.every((approval) => approval.status === "pending"),
  );
  TestValidator.equals(
    "pending pagination current page",
    pendingResult.pagination.current,
    1,
  );
  // 3. Query approved approvals
  const approvedResult = await api.functional.ecommerce.admin.approvals.index(
    adminConnection,
    {
      body: {
        status: "approved",
        page: 1,
        limit: 20,
      } satisfies IEcommerceSellerApproval.IRequest,
    },
  );
  typia.assert(approvedResult);
  // Validate approved results
  TestValidator.predicate(
    "approved filter returns only approved status",
    approvedResult.data.every((approval) => approval.status === "approved"),
  );
  TestValidator.equals(
    "approved pagination current page",
    approvedResult.pagination.current,
    1,
  );
  // 4. Query rejected approvals
  const rejectedResult = await api.functional.ecommerce.admin.approvals.index(
    adminConnection,
    {
      body: {
        status: "rejected",
        page: 1,
        limit: 20,
      } satisfies IEcommerceSellerApproval.IRequest,
    },
  );
  typia.assert(rejectedResult);
  // Validate rejected results
  TestValidator.predicate(
    "rejected filter returns only rejected status",
    rejectedResult.data.every((approval) => approval.status === "rejected"),
  );
  TestValidator.predicate(
    "rejected approvals have rejection reason",
    rejectedResult.data.every(
      (approval) =>
        approval.status === "rejected" &&
        approval.rejection_reason !== null &&
        approval.rejection_reason !== undefined &&
        approval.rejection_reason.length > 0,
    ),
  );
  TestValidator.equals(
    "rejected pagination current page",
    rejectedResult.pagination.current,
    1,
  );
  // 5. Validate pagination metadata structure
  TestValidator.predicate(
    "pending pagination has valid structure",
    pendingResult.pagination.current >= 0 &&
      pendingResult.pagination.limit >= 0 &&
      pendingResult.pagination.records >= 0 &&
      pendingResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "approved pagination has valid structure",
    approvedResult.pagination.current >= 0 &&
      approvedResult.pagination.limit >= 0 &&
      approvedResult.pagination.records >= 0 &&
      approvedResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "rejected pagination has valid structure",
    rejectedResult.pagination.current >= 0 &&
      rejectedResult.pagination.limit >= 0 &&
      rejectedResult.pagination.records >= 0 &&
      rejectedResult.pagination.pages >= 0,
  );
}
