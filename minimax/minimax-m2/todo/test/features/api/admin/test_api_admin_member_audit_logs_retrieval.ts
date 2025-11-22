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

/**
 * Test complete audit log retrieval workflow for admin users. The test follows
 * a comprehensive multi-actor authentication setup where an admin
 * authenticates, creates a test member user and generates various member
 * activities, then retrieves comprehensive audit logs to validate the audit
 * trail system.
 *
 * _Strategic Implementation Plan:_*
 *
 * 1. **Admin Authentication Setup**: Create and authenticate admin account to
 *    establish privileged access for audit log retrieval
 * 2. **Multi-Actor Member Creation**: Create test member through both
 *    authentication and profile creation endpoints to generate diverse audit
 *    trail entries
 * 3. **Activity Generation**: Execute member activities including todo creation to
 *    produce meaningful audit log entries for validation
 * 4. **Audit Trail Retrieval**: Retrieve comprehensive audit logs using the admin
 *    endpoint and validate complete activity capture
 * 5. **Data Integrity Validation**: Verify audit logs contain proper metadata,
 *    timestamps, actor information, and action descriptions
 *
 * _Business Context_*: This test validates the security monitoring and
 * compliance capabilities of the TodoApp system by ensuring administrators can
 * track all user activities with complete forensic detail. The audit system
 * must capture login sessions, todo management operations, and profile
 * interactions with proper attribution and temporal tracking.
 *
 * _Test Flow_*: Admin joins system → Member authenticates and creates todos →
 * Admin retrieves member's complete audit trail → Validation of comprehensive
 * activity logging and proper security boundaries.
 */
export async function test_api_admin_member_audit_logs_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword, // Using plain text as mentioned in API docs
        first_name: "Admin",
        last_name: "User",
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member user through authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPassword123!";

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

  // Step 3: Create additional member profile record to generate more audit entries
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

  // Step 4: Create todo items to generate member activity logs
  const todo1: ITodoAppTodo = await api.functional.todoApp.member.todos.create(
    connection,
    {
      body: {
        title: "Complete project documentation",
        description: "Write comprehensive documentation for the new feature",
        priority: "high",
        category: "development",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1);

  const todo2: ITodoAppTodo = await api.functional.todoApp.member.todos.create(
    connection,
    {
      body: {
        title: "Review code changes",
        description: "Peer review of recent code submissions",
        priority: "medium",
        category: "review",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo2);

  // Step 5: Create administrator account to establish admin context
  const adminAccount: ITodoAppAdministrator =
    await api.functional.todoApp.administrators.create(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        first_name: "Admin",
        last_name: "User",
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(adminAccount);

  // Step 6: Authenticate as admin to access member audit logs
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: "192.168.1.100",
      href: "http://localhost:3000/admin/audit-logs",
      referrer: "http://localhost:3000/admin/dashboard",
    } satisfies ITodoAppAdministrator.ILogin,
  });

  // Step 7: Retrieve comprehensive audit logs for the member
  const auditLogsPage: IPageITodoAppAuditLog =
    await api.functional.todoApp.admin.members.auditLogs.at(connection, {
      memberId: member.id,
    });
  typia.assert(auditLogsPage);

  // Step 8: Validate audit log data integrity and completeness
  TestValidator.equals(
    "audit logs page structure",
    auditLogsPage.data.length > 0,
    true,
  );
  TestValidator.equals(
    "pagination info present",
    auditLogsPage.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "audit logs array exists",
    Array.isArray(auditLogsPage.data),
    true,
  );

  // Validate individual audit log entries
  if (auditLogsPage.data.length > 0) {
    const firstAuditLog = auditLogsPage.data[0];
    TestValidator.equals(
      "audit log has ID",
      firstAuditLog.id !== undefined && firstAuditLog.id !== null,
      true,
    );
    TestValidator.equals(
      "audit log has action type",
      firstAuditLog.action_type !== undefined &&
        firstAuditLog.action_type !== null,
      true,
    );
    TestValidator.equals(
      "audit log has action description",
      firstAuditLog.action_description !== undefined &&
        firstAuditLog.action_description !== null,
      true,
    );
    TestValidator.equals(
      "audit log has entity type",
      firstAuditLog.entity_type !== undefined &&
        firstAuditLog.entity_type !== null,
      true,
    );
    TestValidator.equals(
      "audit log has timestamp",
      firstAuditLog.created_at !== undefined &&
        firstAuditLog.created_at !== null,
      true,
    );
    TestValidator.equals(
      "audit log has severity level",
      firstAuditLog.severity_level !== undefined &&
        firstAuditLog.severity_level !== null,
      true,
    );
  }

  // Step 9: Validate that member activities are properly tracked
  const memberActivities = auditLogsPage.data.filter(
    (log) =>
      log.actor_member_id === member.id || log.target_member_id === member.id,
  );

  TestValidator.equals(
    "member activities captured",
    memberActivities.length > 0,
    true,
  );

  // Check for specific activity types that should have been generated
  const activityTypes = memberActivities.map((log) => log.action_type);
  const hasTodoCreation = activityTypes.some((type) =>
    type.includes("create_todo"),
  );
  const hasLoginActivity = activityTypes.some(
    (type) => type === "login" || type.includes("login"),
  );

  TestValidator.equals("todo creation logged", hasTodoCreation, true);
  TestValidator.equals("login activity logged", hasLoginActivity, true);
}
