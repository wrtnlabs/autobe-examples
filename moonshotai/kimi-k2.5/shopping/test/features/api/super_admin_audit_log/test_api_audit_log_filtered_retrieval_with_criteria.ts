import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test the audit log retrieval endpoint with comprehensive filtering criteria.
 * Authenticates as super administrator and queries audit logs with multiple filters
 * including action types, resource types, and date ranges. Validates the paginated
 * response structure and verifies all required fields are present in audit log entries.
 */
export async function test_api_audit_log_filtered_retrieval_with_criteria(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Calculate date range for filtering (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // 3. Query audit logs with comprehensive filtering criteria
  const response =
    await api.functional.ecommerceMall.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          adminId: null,
          actionTypes: ["approve_seller", "suspend_user"],
          resourceTypes: ["seller", "product"],
          resourceId: null,
          ipAddress: null,
          dateFrom: thirtyDaysAgo.toISOString(),
          dateTo: now.toISOString(),
          createdAt: null,
          id: null,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(response);
  // 4. Verify results are sorted by createdAt in descending order (newest first)
  if (response.data.length > 1) {
    TestValidator.predicate("results sorted by createdAt descending", () => {
      for (let i = 1; i < response.data.length; i++) {
        const prevDate = new Date(response.data[i - 1].createdAt);
        const currDate = new Date(response.data[i].createdAt);
        if (prevDate.getTime() < currDate.getTime()) {
          return false;
        }
      }
      return true;
    });
  }
  // 5. Verify pagination consistency
  TestValidator.predicate("pagination consistency check", () => {
    const { current, limit, records, pages } = response.pagination;
    const expectedPages = Math.ceil(records / limit);
    return pages === expectedPages;
  });
}
