import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_admin_member_audit_logs_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for audit log access
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminTest123!";

  const admin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        first_name: "Test",
        last_name: "Admin",
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member user for audit trail generation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberTest123!";

  const memberAuth: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.join.registerMember(connection, {
      body: {
        email: memberEmail,
        first_name: "Test",
        last_name: "Member",
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(memberAuth);

  // Step 3: Create member profile
  const memberProfile: ITodoAppMember =
    await api.functional.todoApp.member.members.create(connection, {
      body: {
        email: memberEmail,
        first_name: "Test",
        last_name: "Member",
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(memberProfile);

  // Step 4: Generate extensive audit trail by creating multiple todos
  // Create enough todos to test pagination (aim for 15-20 todos)
  const todoCreationPromises = Array.from({ length: 18 }, async (_, index) => {
    return await api.functional.todoApp.member.todos.create(connection, {
      body: {
        title: `Test Todo Item ${index + 1}`,
        description: `This is test todo number ${index + 1} for generating audit logs`,
        status:
          index % 3 === 0
            ? "completed"
            : index % 3 === 1
              ? "in_progress"
              : "pending",
        priority:
          index % 4 === 0
            ? "high"
            : index % 4 === 1
              ? "medium"
              : index % 4 === 2
                ? "low"
                : "urgent",
        category: index % 2 === 0 ? "work" : "personal",
      } satisfies ITodoAppTodo.ICreate,
    });
  });

  const createdTodos = await Promise.all(todoCreationPromises);
  createdTodos.forEach((todo) => typia.assert(todo));

  // Step 5: Authenticate as administrator to access audit logs
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: "192.168.1.100",
      href: "https://admin.todoapp.com/audit-logs",
      referrer: "https://admin.todoapp.com/members",
    } satisfies ITodoAppAdministrator.ILogin,
  });

  // Step 6: Retrieve audit logs in paginated format
  const auditLogsPage: IPageITodoAppAuditLog =
    await api.functional.todoApp.admin.members.auditLogs.at(connection, {
      memberId: memberProfile.id,
    });
  typia.assert(auditLogsPage);

  // Step 7: Validate pagination metadata
  TestValidator.equals(
    "pagination metadata exists",
    auditLogsPage.pagination,
    auditLogsPage.pagination,
  );
  TestValidator.predicate(
    "current page is valid",
    auditLogsPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is positive",
    auditLogsPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is valid",
    auditLogsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages calculation is correct",
    Math.ceil(
      auditLogsPage.pagination.records / auditLogsPage.pagination.limit,
    ) === auditLogsPage.pagination.pages,
  );

  // Step 8: Validate audit log data structure
  TestValidator.predicate(
    "audit logs array exists",
    Array.isArray(auditLogsPage.data),
  );
  TestValidator.predicate(
    "audit logs contain member activities",
    auditLogsPage.data.some((log) => log.actor_member_id === memberProfile.id),
  );

  // Step 9: Validate audit log entries have required properties
  auditLogsPage.data.forEach((log, index) => {
    TestValidator.predicate(`audit log ${index} has id`, !!log.id);
    TestValidator.predicate(
      `audit log ${index} has action type`,
      !!log.action_type,
    );
    TestValidator.predicate(
      `audit log ${index} has action description`,
      !!log.action_description,
    );
    TestValidator.predicate(
      `audit log ${index} has entity type`,
      !!log.entity_type,
    );
    TestValidator.predicate(
      `audit log ${index} has created timestamp`,
      !!log.created_at,
    );
    TestValidator.predicate(
      `audit log ${index} has severity level`,
      !!log.severity_level,
    );
  });

  // Step 10: Validate that todo creation activities are logged
  const todoCreationLogs = auditLogsPage.data.filter(
    (log) =>
      log.action_type === "create_todo" &&
      log.actor_member_id === memberProfile.id,
  );
  TestValidator.predicate(
    "todo creation activities are logged",
    todoCreationLogs.length > 0,
  );
  TestValidator.predicate(
    "sufficient audit trail generated",
    auditLogsPage.data.length >= 15,
  );

  // Step 11: Validate chronological ordering of audit logs
  for (let i = 1; i < auditLogsPage.data.length; i++) {
    const previousLog = new Date(
      auditLogsPage.data[i - 1].created_at,
    ).getTime();
    const currentLog = new Date(auditLogsPage.data[i].created_at).getTime();
    TestValidator.predicate(
      `audit log ${i} is chronologically ordered`,
      previousLog <= currentLog,
    );
  }

  // Step 12: Test pagination with different page sizes if available
  if (auditLogsPage.pagination.pages > 1) {
    // Verify that not all records are on the first page
    TestValidator.predicate(
      "pagination working - not all records on first page",
      auditLogsPage.data.length <= auditLogsPage.pagination.limit,
    );
  } else {
    // If only one page, verify all records fit
    TestValidator.predicate(
      "single page contains all records",
      auditLogsPage.data.length === auditLogsPage.pagination.records,
    );
  }
}
