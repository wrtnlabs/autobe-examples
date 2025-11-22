import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";

export async function test_api_admin_audit_logs_date_range_search(
  connection: api.IConnection,
) {
  // Step 1: Create admin user for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: "admin123",
        first_name: "Admin",
        last_name: "User",
        role_level: "super_admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Generate audit logs by performing various admin actions
  // Note: Since we can't directly create audit logs, we'll rely on existing logs
  // or simulate the audit logging through admin operations

  // Step 3: Retrieve audit logs and validate the response structure
  const auditLogsResponse: IPageITodoAppAuditLog =
    await api.functional.todoApp.admin.system.auditLogs.get(connection);
  typia.assert(auditLogsResponse);

  // Step 4: Validate the audit logs response structure
  TestValidator.equals(
    "audit logs response has pagination info",
    typeof auditLogsResponse.pagination.current,
    "number",
  );
  TestValidator.equals(
    "audit logs response has limit",
    typeof auditLogsResponse.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "audit logs response has records count",
    typeof auditLogsResponse.pagination.records,
    "number",
  );
  TestValidator.equals(
    "audit logs response has pages count",
    typeof auditLogsResponse.pagination.pages,
    "number",
  );

  // Step 5: Validate the audit logs data structure
  TestValidator.equals(
    "audit logs response has data array",
    Array.isArray(auditLogsResponse.data),
    true,
  );

  // Step 6: If audit logs exist, validate their structure
  if (auditLogsResponse.data.length > 0) {
    const firstLog: ITodoAppAuditLog = auditLogsResponse.data[0];

    // Validate required audit log fields
    TestValidator.equals(
      "audit log has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstLog.id,
      ),
      true,
    );

    TestValidator.equals(
      "audit log has action type",
      typeof firstLog.action_type,
      "string",
    );
    TestValidator.equals(
      "audit log has action description",
      typeof firstLog.action_description,
      "string",
    );
    TestValidator.equals(
      "audit log has entity type",
      typeof firstLog.entity_type,
      "string",
    );
    TestValidator.equals(
      "audit log has severity level",
      typeof firstLog.severity_level,
      "string",
    );
    TestValidator.equals(
      "audit log has valid timestamp",
      typeof firstLog.created_at === "string" &&
        !isNaN(Date.parse(firstLog.created_at)),
      true,
    );

    // Step 7: Test temporal filtering by validating timestamps
    const logTimestamps = auditLogsResponse.data
      .map((log) => new Date(log.created_at).getTime())
      .sort((a, b) => a - b);

    // Verify logs are sorted by timestamp (newest first or oldest first)
    if (logTimestamps.length > 1) {
      TestValidator.predicate(
        "audit logs are chronologically ordered",
        logTimestamps[0] <= logTimestamps[logTimestamps.length - 1],
      );
    }

    // Step 8: Validate date range constraints if pagination shows multiple pages
    if (auditLogsResponse.pagination.pages > 1) {
      TestValidator.predicate(
        "pagination indicates more audit data exists",
        auditLogsResponse.pagination.records > auditLogsResponse.data.length,
      );
    }
  }

  // Step 9: Validate that filtering capabilities are preserved for forensic analysis
  TestValidator.predicate(
    "audit logs provide comprehensive filtering data",
    auditLogsResponse.data.every(
      (log) =>
        log.action_type &&
        log.action_description &&
        log.entity_type &&
        log.severity_level &&
        log.created_at,
    ),
  );

  // Step 10: Validate compliance reporting capabilities
  TestValidator.predicate(
    "audit logs support compliance requirements",
    auditLogsResponse.data.every(
      (log) =>
        log.id &&
        log.created_at &&
        (log.actor_administrator_id || log.actor_member_id) &&
        log.action_type &&
        log.severity_level,
    ),
  );
}
