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
 * Test retrieving a paginated list of all super administrator audit logs without any filters.
 *
 * Validates the default audit log listing endpoint which returns all super admin action records in descending order by creation time. This test verifies:
 *
 * 1. Successful authentication and authorization via super admin join
 * 2. Empty request body returns paginated results with default pagination settings
 * 3. Pagination metadata includes correct default values (page=1, limit=20)
 * 4. Each audit log entry contains all required fields: id, action, target_type, target_id, ip, user_agent, created_at
 * 5. Super admin relationship data (id, email) is included in each entry
 * 6. Results are sorted by created_at in descending order (newest first)
 * 7. Total records and pages are calculated correctly based on actual data
 *
 * @param connection Base API connection for the e-commerce mall platform
 */
export async function test_api_superadmin_audit_logs_listing_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(authorized);
  // 2. Call audit logs endpoint with empty request body
  const response =
    await api.functional.ecommerceMall.superAdmin.super_admin.audit_logs.index(
      superAdminConnection,
      {
        body: {} satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata structure and default values
  TestValidator.equals(
    "pagination exists",
    response.pagination !== null && response.pagination !== undefined,
    true,
  );
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("default limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate data array exists
  TestValidator.equals("data array exists", Array.isArray(response.data), true);
  // 5. Validate each audit log entry has required fields
  for (const logEntry of response.data) {
    // Required fields validation
    TestValidator.equals(
      "id is valid UUID format",
      /^[0-9a-f-]{36}$/i.test(logEntry.id),
      true,
    );
    TestValidator.equals(
      "action is a string",
      typeof logEntry.action === "string",
      true,
    );
    TestValidator.equals(
      "ip is a string",
      typeof logEntry.ip === "string",
      true,
    );
    TestValidator.equals(
      "user_agent is a string",
      typeof logEntry.user_agent === "string",
      true,
    );
    TestValidator.equals(
      "created_at is valid date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(logEntry.created_at),
      true,
    );
  }
  // 6. Validate superAdmin relationship data
  for (const logEntry of response.data) {
    if (logEntry.superAdmin) {
      TestValidator.equals(
        "superAdmin id is valid UUID",
        /^[0-9a-f-]{36}$/i.test(logEntry.superAdmin.id),
        true,
      );
      TestValidator.equals(
        "superAdmin email is a string",
        typeof logEntry.superAdmin.email === "string",
        true,
      );
    }
  }
  // 7. Verify results are sorted by created_at in descending order
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = new Date(response.data[i].created_at).getTime();
      const next = new Date(response.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `entry ${i} is not newer than entry ${i + 1}`,
        current >= next,
      );
    }
  }
  // 8. Verify pages calculation is correct
  const expectedPages = Math.ceil(
    response.pagination.records / response.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation is correct",
    response.pagination.pages,
    expectedPages,
  );
}
