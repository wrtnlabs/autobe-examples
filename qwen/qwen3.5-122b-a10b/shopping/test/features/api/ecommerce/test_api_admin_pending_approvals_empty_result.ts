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
 * Test administrator pending seller approvals endpoint with empty result set.
 *
 * Validates the edge case where no seller approval requests are pending in the system. Ensures the API correctly returns an empty data array with proper pagination metadata when there are no pending approvals to review.
 *
 * The test verifies that administrators can access the pending approvals endpoint even when the queue is empty, and that the response structure remains valid with zero records.
 *
 * 1. Administrator authenticates via /ecommerce/auth/admin/join
 * 2. Calls the pending approvals endpoint with pagination parameters
 * 3. Validates response contains empty data array
 * 4. Verifies pagination metadata shows records=0 and pages=0
 * 5. Confirms response structure is valid despite empty results
 */
export async function test_api_admin_pending_approvals_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Call pending approvals endpoint with pagination
  const result = await api.functional.ecommerce.admin.approvals.pending.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceSellerApproval.IRequest,
    },
  );
  typia.assert(result);
  // 3. Validate empty data array
  TestValidator.equals("data array is empty", result.data.length, 0);
  // 4. Validate pagination metadata
  TestValidator.equals("records count is zero", result.pagination.records, 0);
  TestValidator.equals("pages count is zero", result.pagination.pages, 0);
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.equals("limit matches input", result.pagination.limit, 10);
}
