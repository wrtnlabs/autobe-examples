import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_seller_approval_filter_pending_only(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to access seller approval management
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com" as string & tags.Format<"email">,
      password: "1234" as string & tags.Format<"password">,
      href: "https://example.com/admin/login" as string & tags.Format<"uri">,
      referrer: "https://example.com" as string & tags.Format<"uri">,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // Step 2: Call seller-approvals filter with status='pending'
  const pendingApprovals =
    await api.functional.ecommerceMall.admin.admin.seller_approvals.index(
      adminConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallSellerApproval.IRequest,
      },
    );
  typia.assert(pendingApprovals);
  // Step 3: Validate response structure
  TestValidator.equals(
    "has pagination",
    pendingApprovals.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "has data array",
    Array.isArray(pendingApprovals.data),
    true,
  );
  // Step 4: Validate pagination metadata (IPageIEcommerceMall.IPagination wraps IPage.IPagination)
  // The pagination property contains another pagination object with actual pagination fields
  TestValidator.predicate(
    "pagination has current page",
    pendingApprovals.pagination.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    pendingApprovals.pagination.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records",
    pendingApprovals.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    pendingApprovals.pagination.pagination.pages >= 0,
  );
  // Step 5: Validate all returned items have status='pending'
  for (const approval of pendingApprovals.data) {
    TestValidator.equals(
      "approval status is pending",
      approval.status,
      "pending",
    );
    TestValidator.predicate("approval has valid id", approval.id.length > 0);
    TestValidator.predicate(
      "approval has seller info",
      approval.seller !== undefined,
    );
    TestValidator.predicate(
      "approval has createdAt",
      approval.createdAt !== undefined,
    );
    TestValidator.predicate(
      "approval has updatedAt",
      approval.updatedAt !== undefined,
    );
  }
  // Step 6: If there are records, validate seller summary structure
  if (pendingApprovals.data.length > 0) {
    const firstApproval = pendingApprovals.data[0];
    TestValidator.predicate(
      "seller has id",
      firstApproval.seller.id.length > 0,
    );
    TestValidator.predicate(
      "seller has email",
      firstApproval.seller.email.length > 0,
    );
    TestValidator.predicate(
      "seller has approvalStatus",
      firstApproval.seller.approvalStatus !== undefined,
    );
    TestValidator.predicate(
      "seller has createdAt",
      firstApproval.seller.createdAt !== undefined,
    );
  }
}
