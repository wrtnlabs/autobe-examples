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
 * Test administrator viewing pending seller approval requests.
 *
 * Validates the administrator's ability to browse seller registration approval requests filtered by pending status. The test ensures proper authentication, correct filtering, and complete response structure validation including seller information and pagination metadata.
 *
 * 1. Administrator registers and authenticates using authorize_admin_join utility.
 * 2. Create admin-specific connection with authentication token.
 * 3. Query seller approvals endpoint with status filter set to "pending".
 * 4. Validate response contains paginated list of pending approval requests.
 * 5. Verify each approval record includes seller summary (shop_name, email, approval_status).
 * 6. Verify pagination metadata shows correct counts.
 * 7. Validate response structure matches IPageIEcommerceSellerApproval.ISummary type.
 */
export async function test_api_admin_view_pending_seller_approvals(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Query pending seller approvals
  const approvals = await api.functional.ecommerce.admin.approvals.index(
    adminConnection,
    {
      body: {
        status: "pending",
        page: 1,
        limit: 20,
      } satisfies IEcommerceSellerApproval.IRequest,
    },
  );
  typia.assert(approvals);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page valid",
    approvals.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    approvals.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    approvals.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    approvals.pagination.pages >= 0,
  );
  // 4. Validate approval records exist and have correct structure
  if (approvals.data.length > 0) {
    const firstApproval = approvals.data[0];
    // Validate first approval record structure
    TestValidator.predicate(
      "approval has valid ID",
      /^[0-9a-f-]{36}$/i.test(firstApproval.id),
    );
    TestValidator.predicate(
      "seller has valid ID",
      /^[0-9a-f-]{36}$/i.test(firstApproval.seller.id),
    );
    TestValidator.predicate(
      "seller has shop name",
      firstApproval.seller.shop_name.length > 0,
    );
    TestValidator.equals("status is pending", firstApproval.status, "pending");
    // For pending requests, reviewingAdmin and reviewed_at should be null
    TestValidator.equals(
      "reviewingAdmin is null for pending",
      firstApproval.reviewingAdmin,
      null,
    );
    TestValidator.equals(
      "reviewed_at is null for pending",
      firstApproval.reviewed_at,
      null,
    );
  }
  // 5. Validate all records have pending status
  TestValidator.predicate(
    "all records are pending",
    approvals.data.every((approval) => approval.status === "pending"),
  );
}
