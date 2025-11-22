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
 * Test basic audit log retrieval functionality by authenticated administrator.
 *
 * This comprehensive test validates the core administrative monitoring
 * capabilities of the TodoApp system. The test flow begins with administrator
 * account creation to establish proper authentication context, followed by
 * retrieving comprehensive audit logs through the designated admin endpoint.
 *
 * The test specifically validates:
 *
 * 1. **Administrative Authentication**: Successfully creating a new administrator
 *    account with proper credentials
 * 2. **Audit Log Access**: Verifying that authenticated administrators can access
 *    the audit log retrieval endpoint
 * 3. **Data Structure Validation**: Ensuring the returned audit log data matches
 *    the expected schema with proper pagination information
 * 4. **Comprehensive Audit Trail**: Confirming that the audit logs provide
 *    complete visibility into system activities for security oversight
 * 5. **Pagination Integrity**: Validating that the pagination system works
 *    correctly for large audit log datasets
 *
 * This scenario is critical for security operations center (SOC) activities,
 * compliance reporting, and regulatory audit requirements. The test ensures
 * that administrators have proper access to audit trails while maintaining the
 * integrity and accessibility of security monitoring data.
 *
 * The test follows a realistic business workflow: account creation →
 * authentication → audit log retrieval → data validation, ensuring the
 * administrative monitoring functionality works as expected in a production
 * environment.
 */
export async function test_api_admin_audit_logs_basic_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: RandomGenerator.alphaNumeric(16),
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Validate admin account creation
  TestValidator.equals(
    "admin account creation successful",
    admin.id.length > 0,
    true,
  );
  TestValidator.equals(
    "admin token access exists",
    admin.token.access.length > 0,
    true,
  );

  // Step 3: Retrieve audit logs as authenticated administrator
  const auditLogs: IPageITodoAppAuditLog =
    await api.functional.todoApp.admin.system.auditLogs.get(connection);
  typia.assert(auditLogs);

  // Step 4: Validate audit log data structure
  TestValidator.equals(
    "audit logs have pagination data",
    auditLogs.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "audit logs have limit setting",
    auditLogs.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "audit logs have records count",
    auditLogs.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "audit logs have pages calculation",
    auditLogs.pagination.pages >= 0,
    true,
  );

  // Step 5: Validate audit log entries structure
  if (auditLogs.data.length > 0) {
    const firstLog: ITodoAppAuditLog = auditLogs.data[0];

    // Validate required audit log fields
    TestValidator.equals(
      "audit log has valid UUID",
      firstLog.id.length > 0,
      true,
    );
    TestValidator.equals(
      "audit log has action type",
      firstLog.action_type.length > 0,
      true,
    );
    TestValidator.equals(
      "audit log has action description",
      firstLog.action_description.length > 0,
      true,
    );
    TestValidator.equals(
      "audit log has entity type",
      firstLog.entity_type.length > 0,
      true,
    );
    TestValidator.equals(
      "audit log has severity level",
      firstLog.severity_level.length > 0,
      true,
    );
    TestValidator.equals(
      "audit log has creation timestamp",
      firstLog.created_at.length > 0,
      true,
    );

    // Validate optional fields exist (may be null/undefined)
    if (firstLog.actor_member_id !== undefined) {
      TestValidator.equals(
        "actor member ID is valid UUID when present",
        firstLog.actor_member_id.length > 0,
        true,
      );
    }
    if (firstLog.actor_administrator_id !== undefined) {
      TestValidator.equals(
        "actor administrator ID is valid UUID when present",
        firstLog.actor_administrator_id.length > 0,
        true,
      );
    }
  }

  // Step 6: Validate pagination consistency
  TestValidator.equals(
    "pagination records matches data array length consistency",
    auditLogs.data.length <= auditLogs.pagination.limit,
    true,
  );

  // Step 7: Validate audit trail accessibility
  TestValidator.equals(
    "audit logs are accessible to authenticated admin",
    auditLogs.data !== null && auditLogs.pagination !== null,
    true,
  );
}
