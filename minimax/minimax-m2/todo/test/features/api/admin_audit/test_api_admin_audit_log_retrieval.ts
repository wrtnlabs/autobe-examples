import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";

export async function test_api_admin_audit_log_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin and create test administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const authenticatedAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password_hash: "secure_password_hash_123",
      first_name: "Test",
      last_name: "Administrator",
      role_level: "admin",
      status: "active",
    } satisfies ITodoAppAdministrator.ICreate,
  });

  // Step 2: Create administrator account to generate audit logs
  const testAdmin = await api.functional.todoApp.administrators.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: "test_password_hash_456",
        first_name: "John",
        last_name: "Doe",
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    },
  );

  // Step 3: Retrieve audit logs for the test administrator
  const auditLogs =
    await api.functional.todoApp.admin.administrators.auditLogs.index(
      connection,
      {
        administratorId: testAdmin.id,
      },
    );

  // Step 4: Validate audit log pagination structure
  TestValidator.equals(
    "audit logs pagination structure",
    auditLogs.pagination,
    {
      current: 0,
      limit: 10,
      records: 0,
      pages: 0,
    } satisfies IPage.IPagination,
  );

  // Step 5: Validate audit logs response structure
  TestValidator.equals(
    "audit logs data array",
    Array.isArray(auditLogs.data),
    true,
  );

  // Step 6: Validate individual audit log entry structure if data exists
  if (auditLogs.data.length > 0) {
    const firstLog = auditLogs.data[0];

    // Validate required audit log fields
    TestValidator.predicate(
      "audit log has valid ID",
      typeof firstLog.id === "string",
    );
    TestValidator.predicate(
      "audit log has action type",
      typeof firstLog.action_type === "string",
    );
    TestValidator.predicate(
      "audit log has action description",
      typeof firstLog.action_description === "string",
    );
    TestValidator.predicate(
      "audit log has entity type",
      typeof firstLog.entity_type === "string",
    );
    TestValidator.predicate(
      "audit log has severity level",
      typeof firstLog.severity_level === "string",
    );
    TestValidator.predicate(
      "audit log has creation timestamp",
      typeof firstLog.created_at === "string",
    );

    // Validate UUID format if IDs are present
    if (firstLog.actor_administrator_id) {
      TestValidator.predicate(
        "actor administrator ID is valid UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          firstLog.actor_administrator_id,
        ),
      );
    }

    if (firstLog.entity_id) {
      TestValidator.predicate(
        "entity ID is valid UUID format",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          firstLog.entity_id,
        ),
      );
    }

    // Validate timestamp format (ISO 8601)
    TestValidator.predicate(
      "creation timestamp is valid ISO format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(firstLog.created_at),
    );
  }

  // Step 7: Perform error validation - test with invalid administrator ID
  await TestValidator.error(
    "should fail with invalid administrator ID",
    async () => {
      await api.functional.todoApp.admin.administrators.auditLogs.index(
        connection,
        {
          administratorId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
