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

export async function test_api_admin_member_audit_logs_todo_activities(
  connection: api.IConnection,
) {
  // Create administrator account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: typia.random<string & tags.MinLength<8>>(),
        first_name: "Admin",
        last_name: "User",
        role_level: "super_admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create member account and authenticate as member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.join.registerMember(connection, {
      body: {
        email: memberEmail,
        first_name: "Test",
        last_name: "Member",
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(member);

  // Create member profile
  const memberProfile: ITodoAppMember =
    await api.functional.todoApp.member.members.create(connection, {
      body: {
        email: member.email,
        first_name: member.first_name,
        last_name: member.last_name,
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(memberProfile);

  // Generate todo activities - Create first todo
  const firstTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.create(connection, {
      body: {
        title: "Complete project documentation",
        description: "Write comprehensive documentation for the new feature",
        priority: "high",
        category: "development",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(firstTodo);

  // Generate todo activities - Create second todo
  const secondTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.create(connection, {
      body: {
        title: "Review code changes",
        description: "Review and approve pull requests",
        priority: "medium",
        category: "code_review",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(secondTodo);

  // Switch back to administrator authentication to access audit logs
  const adminAuth: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminEmail, // Using email as password for consistency
        ip: "192.168.1.100",
        href: "http://localhost:3000/admin/audit",
        referrer: "http://localhost:3000/admin",
      } satisfies ITodoAppAdministrator.ILogin,
    });
  typia.assert(adminAuth);

  // Retrieve and validate audit logs as administrator
  const auditLogsPage: IPageITodoAppAuditLog =
    await api.functional.todoApp.admin.members.auditLogs.at(connection, {
      memberId: memberProfile.id,
    });
  typia.assert(auditLogsPage);

  // Validate audit logs contain expected member activities
  TestValidator.predicate(
    "audit logs contain member todo creation activities",
    auditLogsPage.data.length > 0,
  );

  const memberTodoCreationLogs = auditLogsPage.data.filter(
    (log) =>
      log.actor_member_id === memberProfile.id &&
      (log.action_type === "create_todo" ||
        log.target_todo_id === firstTodo.id ||
        log.target_todo_id === secondTodo.id),
  );
  TestValidator.predicate(
    "member todo creation activities captured in audit logs",
    memberTodoCreationLogs.length >= 2,
  );

  // Validate audit log metadata
  if (auditLogsPage.data.length > 0) {
    const firstLog = auditLogsPage.data[0];
    TestValidator.predicate(
      "audit logs contain action type",
      firstLog.action_type.length > 0,
    );
    TestValidator.predicate(
      "audit logs contain entity type",
      firstLog.entity_type.length > 0,
    );
    TestValidator.predicate(
      "audit logs contain actor reference",
      firstLog.actor_member_id === memberProfile.id ||
        firstLog.actor_administrator_id === adminAuth.id,
    );
    TestValidator.predicate(
      "audit logs contain timestamps",
      firstLog.created_at.length > 0 && firstLog.created_at.includes("T"),
    );

    // Validate that todo-related actions are properly tracked
    const todoActions = auditLogsPage.data.filter(
      (log) => log.entity_type === "todo" || log.action_type.includes("todo"),
    );
    TestValidator.predicate(
      "todo-related actions are tracked in audit logs",
      todoActions.length > 0,
    );
  }
}
