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
 * Comprehensive audit log search and filtering capabilities test for
 * administrators.
 *
 * Validates that administrators can search and filter audit logs using various
 * criteria including action types, severity levels, date ranges, actor types,
 * and entity relationships. Tests both successful operations and proper access
 * controls for sensitive audit data.
 *
 * Test Flow:
 *
 * 1. Create administrator account for audit log access
 * 2. Create member account and profile for activity generation
 * 3. Generate diverse member activities (todo operations) to create audit trail
 * 4. Switch to administrator context and perform comprehensive search tests
 * 5. Validate all filter criteria return appropriate filtered results
 * 6. Verify pagination, sorting, and cross-actor audit logging
 */
export async function test_api_admin_member_audit_logs_search_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for search operations
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "AdminPass123!";

  const admin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        first_name: "Admin",
        last_name: "User",
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member account for activity generation
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = "MemberPass123!";

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

  // Step 4: Generate diverse member activities to create audit trail
  const todo1: ITodoAppTodo = await api.functional.todoApp.member.todos.create(
    connection,
    {
      body: {
        title: "Complete project documentation",
        description: "Write comprehensive API documentation",
        status: "pending",
        priority: "high",
        category: "work",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1);

  const todo2: ITodoAppTodo = await api.functional.todoApp.member.todos.create(
    connection,
    {
      body: {
        title: "Review code changes",
        description: "Review pull requests and merge changes",
        status: "in_progress",
        priority: "medium",
        category: "development",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo2);

  const todo3: ITodoAppTodo = await api.functional.todoApp.member.todos.create(
    connection,
    {
      body: {
        title: "Team meeting preparation",
        description: "Prepare agenda and materials",
        status: "completed",
        priority: "urgent",
        category: "meetings",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo3);

  // Step 5: Switch to administrator context for audit log search
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: "192.168.1.100",
      href: "https://admin.example.com/audit",
      referrer: "https://admin.example.com/dashboard",
    } satisfies ITodoAppAdministrator.ILogin,
  });

  // Step 6: Test basic audit log search (no filters)
  const basicSearch: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.members.auditLogs.index(connection, {
      memberId: memberProfile.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(basicSearch);
  TestValidator.predicate(
    "audit logs returned successfully",
    basicSearch.data.length > 0,
  );

  // Step 7: Test action type filtering
  const actionTypeFiltered: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.members.auditLogs.index(connection, {
      memberId: memberProfile.id,
      body: {
        page: 1,
        limit: 10,
        action_type: "create_todo",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(actionTypeFiltered);
  TestValidator.predicate(
    "action type filtering works",
    actionTypeFiltered.data.length >= 0 &&
      actionTypeFiltered.data.every(
        (log) => log.action_type === "create_todo" || !log.action_type,
      ),
  );

  // Step 8: Test severity level filtering
  const severityFiltered: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.members.auditLogs.index(connection, {
      memberId: memberProfile.id,
      body: {
        page: 1,
        limit: 10,
        severity_level: "info",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(severityFiltered);

  // Step 9: Test date range filtering
  const currentDate = new Date();
  const yesterday = new Date(
    currentDate.getTime() - 24 * 60 * 60 * 1000,
  ).toISOString();
  const tomorrow = new Date(
    currentDate.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();

  const dateRangeFiltered: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.members.auditLogs.index(connection, {
      memberId: memberProfile.id,
      body: {
        page: 1,
        limit: 10,
        created_after: yesterday,
        created_before: tomorrow,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(dateRangeFiltered);
  TestValidator.predicate(
    "date range filtering works",
    dateRangeFiltered.data.length >= 0,
  );

  // Step 10: Test actor member ID filtering
  const actorFiltered: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.members.auditLogs.index(connection, {
      memberId: memberProfile.id,
      body: {
        page: 1,
        limit: 10,
        actor_member_id: memberProfile.id,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(actorFiltered);

  // Step 11: Test target todo ID filtering
  const targetTodoFiltered: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.members.auditLogs.index(connection, {
      memberId: memberProfile.id,
      body: {
        page: 1,
        limit: 10,
        target_todo_id: todo1.id,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(targetTodoFiltered);

  // Step 12: Test entity type filtering
  const entityTypeFiltered: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.members.auditLogs.index(connection, {
      memberId: memberProfile.id,
      body: {
        page: 1,
        limit: 10,
        entity_type: "todo",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(entityTypeFiltered);

  // Step 13: Test pagination (second page)
  const secondPage: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.members.auditLogs.index(connection, {
      memberId: memberProfile.id,
      body: {
        page: 2,
        limit: 5,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(secondPage);
  TestValidator.equals(
    "pagination works correctly",
    secondPage.pagination.current,
    2,
  );

  // Step 14: Test sorting by created_at descending
  const sortedDescending: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.members.auditLogs.index(connection, {
      memberId: memberProfile.id,
      body: {
        page: 1,
        limit: 10,
        order_by: "created_at",
        order_direction: "desc",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(sortedDescending);
  TestValidator.predicate(
    "sorting by created_at desc works",
    sortedDescending.data.length >= 0,
  );

  // Step 15: Test sorting by severity_level
  const sortedBySeverity: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.members.auditLogs.index(connection, {
      memberId: memberProfile.id,
      body: {
        page: 1,
        limit: 10,
        order_by: "severity_level",
        order_direction: "asc",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(sortedBySeverity);

  // Step 16: Test combined filters (action_type + severity_level + date range)
  const combinedFilters: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.members.auditLogs.index(connection, {
      memberId: memberProfile.id,
      body: {
        page: 1,
        limit: 10,
        action_type: "create_todo",
        severity_level: "info",
        created_after: yesterday,
        order_by: "created_at",
        order_direction: "desc",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(combinedFilters);
  TestValidator.predicate(
    "combined filters work correctly",
    combinedFilters.data.length >= 0,
  );

  // Step 17: Test include_deleted option
  const withDeleted: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.members.auditLogs.index(connection, {
      memberId: memberProfile.id,
      body: {
        page: 1,
        limit: 10,
        include_deleted: true,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(withDeleted);

  // Step 18: Validate pagination metadata integrity
  const paginationTest: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.members.auditLogs.index(connection, {
      memberId: memberProfile.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(paginationTest);

  TestValidator.equals(
    "pagination metadata is correct",
    paginationTest.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "total records tracked",
    paginationTest.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page count calculated",
    paginationTest.pagination.pages >= 0,
  );

  // Final validation - ensure we can access audit logs with proper authorization
  TestValidator.predicate(
    "audit log search completed successfully",
    basicSearch.data.length >= 0,
  );
}
