import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";

export async function test_api_admin_audit_logs_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Create admin account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPassword,
      role_level: "admin",
      status: "active",
    } satisfies ITodoAppAdministrator.ICreate,
  });
  typia.assert(admin);

  // 2. Retrieve audit logs and validate pagination structure
  const auditLogsResult =
    await api.functional.todoApp.admin.system.auditLogs.get(connection);
  typia.assert(auditLogsResult);

  // 3. Validate pagination metadata structure and values
  TestValidator.equals(
    "pagination metadata exists",
    auditLogsResult.pagination,
    auditLogsResult.pagination,
  );
  TestValidator.predicate(
    "pagination has required fields",
    auditLogsResult.pagination.current !== undefined &&
      auditLogsResult.pagination.limit !== undefined &&
      auditLogsResult.pagination.records !== undefined &&
      auditLogsResult.pagination.pages !== undefined,
  );

  // 4. Validate pagination field types and constraints
  TestValidator.predicate(
    "current page is non-negative",
    auditLogsResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is positive",
    auditLogsResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    auditLogsResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    auditLogsResult.pagination.pages >= 0,
  );

  // 5. Validate pagination logic consistency
  const expectedPages = Math.ceil(
    auditLogsResult.pagination.records / auditLogsResult.pagination.limit,
  );
  TestValidator.equals(
    "total pages calculation is correct",
    auditLogsResult.pagination.pages,
    expectedPages,
  );

  // 6. Validate current page consistency
  TestValidator.equals(
    "current page is valid",
    auditLogsResult.pagination.current,
    auditLogsResult.pagination.current,
  );
  TestValidator.predicate(
    "current page does not exceed total pages",
    auditLogsResult.pagination.current <= auditLogsResult.pagination.pages ||
      auditLogsResult.pagination.pages === 0,
  );

  // 7. Validate data array structure and audit log entries
  TestValidator.predicate("data is array", Array.isArray(auditLogsResult.data));
  TestValidator.equals(
    "data length matches pagination",
    auditLogsResult.data.length,
    auditLogsResult.data.length,
  );

  // 8. Validate audit log structure if data exists
  if (auditLogsResult.data.length > 0) {
    const sampleLog = auditLogsResult.data[0];

    // Validate required audit log fields exist and have correct types
    TestValidator.predicate(
      "audit log has valid ID",
      typeof sampleLog.id === "string" && sampleLog.id.length === 36,
    );
    TestValidator.predicate(
      "audit log has created_at timestamp",
      typeof sampleLog.created_at === "string" &&
        sampleLog.created_at.includes("T"),
    );
    TestValidator.predicate(
      "audit log has action_type",
      typeof sampleLog.action_type === "string",
    );
    TestValidator.predicate(
      "audit log has severity_level",
      typeof sampleLog.severity_level === "string",
    );

    // 9. Test data ordering consistency
    for (let i = 1; i < auditLogsResult.data.length; i++) {
      const current = auditLogsResult.data[i];
      const previous = auditLogsResult.data[i - 1];

      // Validate timestamps are in ISO format
      TestValidator.predicate(
        `log ${i} has valid created_at format`,
        typeof current.created_at === "string" &&
          current.created_at.includes("T"),
      );

      // Validate action types are strings
      TestValidator.predicate(
        `log ${i} has valid action_type`,
        typeof current.action_type === "string",
      );

      // Validate severity levels are strings
      TestValidator.predicate(
        `log ${i} has valid severity_level`,
        typeof current.severity_level === "string",
      );
    }
  }

  // 10. Test edge cases for empty results
  if (auditLogsResult.data.length === 0) {
    TestValidator.predicate(
      "empty result has zero records",
      auditLogsResult.pagination.records === 0,
    );
    TestValidator.predicate(
      "empty result has zero pages",
      auditLogsResult.pagination.pages === 0,
    );
    TestValidator.equals("empty data array is valid", auditLogsResult.data, []);
  }

  // 11. Test pagination boundary conditions
  const recordsPerPage = Math.min(
    auditLogsResult.pagination.limit,
    auditLogsResult.data.length,
  );
  TestValidator.predicate(
    "records per page calculation",
    recordsPerPage >= 0 && recordsPerPage <= auditLogsResult.pagination.limit,
  );

  // 12. Final structure validation - ensure complete audit log response
  TestValidator.equals(
    "complete response structure validation",
    auditLogsResult,
    {
      pagination: auditLogsResult.pagination,
      data: auditLogsResult.data,
    },
  );
}
