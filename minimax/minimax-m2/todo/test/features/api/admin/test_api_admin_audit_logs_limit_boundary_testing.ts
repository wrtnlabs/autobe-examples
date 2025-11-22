import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";

/**
 * Test audit log search with maximum limit parameter (100) and minimum limit
 * (1) to validate boundary conditions. This test validates that pagination
 * controls work correctly at maximum and minimum page sizes while maintaining
 * performance and proper metadata handling.
 */
export async function test_api_admin_audit_logs_limit_boundary_testing(
  connection: api.IConnection,
) {
  // Step 1: Create admin user for authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminUser: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: "admin123",
        role_level: "super_admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(adminUser);

  // Step 2: Test maximum limit boundary (100)
  const maxLimitResult: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 1,
        limit: 100, // Maximum limit boundary
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(maxLimitResult);

  // Step 3: Test minimum limit boundary (1)
  const minLimitResult: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 1,
        limit: 1, // Minimum limit boundary
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(minLimitResult);

  // Step 4: Validate pagination metadata consistency
  TestValidator.equals(
    "max limit response has pagination metadata",
    maxLimitResult.pagination !== undefined,
    true,
  );

  TestValidator.equals(
    "min limit response has pagination metadata",
    minLimitResult.pagination !== undefined,
    true,
  );

  // Step 5: Validate limit values are properly applied
  TestValidator.equals(
    "max limit returns correct limit in pagination",
    maxLimitResult.pagination.limit,
    100,
  );

  TestValidator.equals(
    "min limit returns correct limit in pagination",
    minLimitResult.pagination.limit,
    1,
  );

  // Step 6: Validate page numbers are consistent
  TestValidator.equals(
    "max limit uses page 1",
    maxLimitResult.pagination.current,
    1,
  );

  TestValidator.equals(
    "min limit uses page 1",
    minLimitResult.pagination.current,
    1,
  );

  // Step 7: Test that pagination metadata exists for both boundaries
  TestValidator.equals(
    "max limit pagination has records count",
    typeof maxLimitResult.pagination.records,
    "number",
  );

  TestValidator.equals(
    "min limit pagination has records count",
    typeof minLimitResult.pagination.records,
    "number",
  );

  TestValidator.equals(
    "max limit pagination has pages calculation",
    typeof maxLimitResult.pagination.pages,
    "number",
  );

  TestValidator.equals(
    "min limit pagination has pages calculation",
    typeof minLimitResult.pagination.pages,
    "number",
  );

  // Step 8: Verify data array exists for both boundary tests
  TestValidator.equals(
    "max limit returns data array",
    Array.isArray(maxLimitResult.data),
    true,
  );

  TestValidator.equals(
    "min limit returns data array",
    Array.isArray(minLimitResult.data),
    true,
  );
}
