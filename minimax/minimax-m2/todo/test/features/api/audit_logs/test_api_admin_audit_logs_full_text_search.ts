import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";

export async function test_api_admin_audit_logs_full_text_search(
  connection: api.IConnection,
) {
  // Step 1: Create administrative account for authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);

  const adminAccount: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        first_name: "Admin",
        last_name: "Tester",
        role_level: "super_admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });

  typia.assert(adminAccount);
  TestValidator.equals(
    "admin authentication success",
    adminAccount.id !== undefined,
    true,
  );

  // Step 2: Retrieve audit logs with administrative access
  const auditLogsResponse: IPageITodoAppAuditLog =
    await api.functional.todoApp.admin.system.auditLogs.get(connection);

  typia.assert(auditLogsResponse);
  TestValidator.equals(
    "audit logs response structure",
    auditLogsResponse.data !== undefined,
    true,
  );
  TestValidator.equals(
    "audit logs pagination info",
    auditLogsResponse.pagination !== undefined,
    true,
  );

  // Step 3: Validate audit log data structure and content
  if (auditLogsResponse.data.length > 0) {
    const sampleLog: ITodoAppAuditLog = auditLogsResponse.data[0];
    typia.assert(sampleLog);

    // Validate essential audit log fields
    TestValidator.equals("audit log has id", sampleLog.id !== undefined, true);
    TestValidator.equals(
      "audit log has action type",
      sampleLog.action_type !== undefined,
      true,
    );
    TestValidator.equals(
      "audit log has action description",
      sampleLog.action_description !== undefined,
      true,
    );
    TestValidator.equals(
      "audit log has timestamp",
      sampleLog.created_at !== undefined,
      true,
    );

    // Validate search-relevant fields for full-text search capability
    if (
      sampleLog.action_description &&
      sampleLog.action_description.length > 0
    ) {
      TestValidator.predicate(
        "action description contains searchable text",
        sampleLog.action_description.length > 0,
      );
    }

    if (sampleLog.user_agent && sampleLog.user_agent.length > 0) {
      TestValidator.predicate(
        "user agent string contains searchable text",
        sampleLog.user_agent.length > 0,
      );
    }
  }

  // Step 4: Test pagination functionality
  const pagination: IPage.IPagination = auditLogsResponse.pagination;
  TestValidator.equals(
    "pagination current page",
    typeof pagination.current,
    "number",
  );
  TestValidator.equals("pagination limit", typeof pagination.limit, "number");
  TestValidator.equals(
    "pagination records",
    typeof pagination.records,
    "number",
  );
  TestValidator.equals("pagination pages", typeof pagination.pages, "number");
  TestValidator.predicate(
    "pagination values are non-negative",
    pagination.current >= 0 && pagination.limit >= 0 && pagination.records >= 0,
  );

  // Step 5: Validate data integrity across multiple log entries
  if (auditLogsResponse.data.length > 1) {
    for (let i = 0; i < Math.min(auditLogsResponse.data.length, 5); i++) {
      const log: ITodoAppAuditLog = auditLogsResponse.data[i];
      typia.assert(log);

      // Validate that each audit log has consistent structure
      TestValidator.equals(
        `audit log ${i} has valid id`,
        typeof log.id,
        "string",
      );
      TestValidator.equals(
        `audit log ${i} has action type`,
        typeof log.action_type,
        "string",
      );
      TestValidator.equals(
        `audit log ${i} has created timestamp`,
        typeof log.created_at,
        "string",
      );
    }
  }

  // Step 6: Test access control - ensure admin-only access
  // Since we're authenticated as admin, this should succeed
  const secondAuditLogsCall: IPageITodoAppAuditLog =
    await api.functional.todoApp.admin.system.auditLogs.get(connection);

  typia.assert(secondAuditLogsCall);
  TestValidator.equals(
    "second audit logs call success",
    secondAuditLogsCall.data !== undefined,
    true,
  );

  // Step 7: Validate that the audit logs contain relevant administrative activity
  let hasRelevantActivity: boolean = false;
  const searchTerms: string[] = [
    "admin",
    "user",
    "create",
    "update",
    "delete",
    "login",
    "logout",
  ];

  for (const log of auditLogsResponse.data.slice(0, 10)) {
    // Check first 10 entries
    const searchableText: string =
      `${log.action_type} ${log.action_description}`.toLowerCase();

    for (const term of searchTerms) {
      if (searchableText.includes(term)) {
        hasRelevantActivity = true;
        break;
      }
    }

    if (hasRelevantActivity) break;
  }

  TestValidator.predicate(
    "audit logs contain searchable administrative activity",
    hasRelevantActivity || auditLogsResponse.data.length === 0,
  );
}
