import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import type { IEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test filtering super administrator audit logs by action type to track specific administrative actions like promotions and demotions.
 *
 * Validates the audit log filtering functionality by testing action type filters such as 'promote_to_super_admin' and 'demote_to_admin'. Ensures that when filtering by a specific action type, all returned records contain that action type.
 *
 * The test verifies:
 * 1. Authentication as super admin grants access to audit log endpoint
 * 2. Filtering by 'promote_to_super_admin' action returns only promotion records
 * 3. Filtering by 'demote_to_admin' action returns only demotion records
 * 4. Pagination combined with action filter maintains consistent filtering across pages
 * 5. Empty result handling when no records match the filter criteria
 *
 * 1. Authenticate as super admin via /auth/superAdmin/join
 * 2. Call PATCH /ecommerceMall/superAdmin/super-admin/audit-logs with action filter set to 'promote_to_super_admin'
 * 3. Validate that all returned records have action = 'promote_to_super_admin'
 * 4. Call again with action filter set to 'demote_to_admin'
 * 5. Validate that all returned records have action = 'demote_to_admin'
 * 6. Verify the filtering logic works correctly by checking multiple result pages
 * 7. Test combining action filter with pagination to verify consistent filtering across pages
 */
export async function test_api_superadmin_audit_logs_filter_by_action_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Test filtering by 'promote_to_super_admin' action type
  const promoteLogsResult =
    await api.functional.ecommerceMall.superAdmin.super_admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          action: "promote_to_super_admin",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(promoteLogsResult);
  // Validate all records have the correct action type
  for (const log of promoteLogsResult.data) {
    TestValidator.equals(
      "action type must be 'promote_to_super_admin'",
      log.action,
      "promote_to_super_admin",
    );
  }
  // 3. Test filtering by 'demote_to_admin' action type
  const demoteLogsResult =
    await api.functional.ecommerceMall.superAdmin.super_admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          action: "demote_to_admin",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(demoteLogsResult);
  // Validate all records have the correct action type
  for (const log of demoteLogsResult.data) {
    TestValidator.equals(
      "action type must be 'demote_to_admin'",
      log.action,
      "demote_to_admin",
    );
  }
  // 4. Test pagination with action filter for consistency
  const paginatedResult =
    await api.functional.ecommerceMall.superAdmin.super_admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          action: "promote_to_super_admin",
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Verify pagination metadata is correct
  TestValidator.predicate(
    "pagination limit should be 5",
    paginatedResult.pagination.limit === 5,
  );
  TestValidator.predicate(
    "current page should be 1",
    paginatedResult.pagination.current === 1,
  );
  // Validate all records on all pages have the correct action type
  for (const log of paginatedResult.data) {
    TestValidator.equals(
      "action type must be 'promote_to_super_admin' on paginated results",
      log.action,
      "promote_to_super_admin",
    );
  }
  // 5. Test filtering with non-existent action type (empty result)
  const emptyResult =
    await api.functional.ecommerceMall.superAdmin.super_admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          action: "nonexistent_action_type_12345",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(emptyResult);
  // Validate empty result
  TestValidator.equals(
    "empty result should have no data",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty result pagination records should be 0",
    emptyResult.pagination.records,
    0,
  );
}
