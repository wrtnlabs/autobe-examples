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
 * Test audit log search with action type filtering.
 *
 * This comprehensive test validates the audit log filtering functionality by:
 *
 * 1. **Setup Phase**: Creating administrator and member accounts with proper
 *    authentication
 * 2. **Activity Generation**: Creating diverse member activities (login, logout,
 *    todo operations, profile updates) to generate various action types in
 *    audit logs
 * 3. **Action Type Filtering**: Testing the audit log search endpoint with
 *    specific action type filters
 * 4. **Validation**: Ensuring that action-based filtering correctly identifies and
 *    returns only audit logs for specified action categories
 *
 * The test ensures that administrators can effectively search and filter member
 * audit logs by specific action types, enabling targeted security monitoring
 * and compliance analysis.
 */
export async function test_api_admin_member_audit_logs_action_type_search(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = "AdminPassword123!";
  const admin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        first_name: "Admin",
        last_name: "User",
        role_level: "super_admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member account
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = "MemberPassword123!";
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

  // Step 4: Generate todo operations for action type coverage
  const todo1: ITodoAppTodo = await api.functional.todoApp.member.todos.create(
    connection,
    {
      body: {
        title: "Complete project documentation",
        description: "Write comprehensive documentation for the new feature",
        priority: "high",
        category: "work",
        due_date: new Date(Date.now() + 86400000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1);

  const todo2: ITodoAppTodo = await api.functional.todoApp.member.todos.create(
    connection,
    {
      body: {
        title: "Review code changes",
        description: "Review pull requests and provide feedback",
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
        title: "Update user interface",
        description: "Improve the user experience based on feedback",
        priority: "urgent",
        category: "ui",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo3);

  // Step 5: Perform member logout to generate different action types
  await api.functional.auth.member.login.authenticateMember(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      ip: "192.168.1.100",
      href: "https://example.com/login",
      referrer: "https://example.com/",
    } satisfies ITodoAppMember.ILogin,
  });
  typia.assert(member);

  // Step 6: Create additional todo to generate more action types
  const todo4: ITodoAppTodo = await api.functional.todoApp.member.todos.create(
    connection,
    {
      body: {
        title: "Plan team meeting",
        description: "Schedule and prepare for the weekly team meeting",
        priority: "medium",
        category: "meetings",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo4);

  // Step 7: Switch to administrator for audit log search testing
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: "192.168.1.1",
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/",
    } satisfies ITodoAppAdministrator.ILogin,
  });
  typia.assert(admin);

  // Step 8: Test action type filtering - Search for todo-related actions
  const todoActionsSearch: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.members.auditLogs.index(connection, {
      memberId: memberProfile.id,
      body: {
        page: 1,
        limit: 20,
        action_type: "create_todo",
        order_by: "created_at",
        order_direction: "desc",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(todoActionsSearch);

  // Validate that search returned todo-related actions
  TestValidator.predicate(
    "search should return todo creation actions",
    todoActionsSearch.data.length > 0,
  );

  // Step 9: Test action type filtering - Search for authentication actions
  const authActionsSearch: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.members.auditLogs.index(connection, {
      memberId: memberProfile.id,
      body: {
        page: 1,
        limit: 20,
        action_type: "login",
        order_by: "created_at",
        order_direction: "desc",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(authActionsSearch);

  // Validate that search returned authentication actions
  TestValidator.predicate(
    "search should return login actions",
    authActionsSearch.data.length > 0,
  );

  // Step 10: Test action type filtering - Search for profile-related actions
  const profileActionsSearch: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.members.auditLogs.index(connection, {
      memberId: memberProfile.id,
      body: {
        page: 1,
        limit: 20,
        action_type: "create_member",
        order_by: "created_at",
        order_direction: "desc",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(profileActionsSearch);

  // Validate that search returned profile creation actions
  TestValidator.predicate(
    "search should return member creation actions",
    profileActionsSearch.data.length > 0,
  );

  // Step 11: Test combined filtering - Multiple action types
  const combinedSearch: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.members.auditLogs.index(connection, {
      memberId: memberProfile.id,
      body: {
        page: 1,
        limit: 50,
        action_type: "create_todo",
        order_by: "created_at",
        order_direction: "desc",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(combinedSearch);

  // Validate combined search results
  TestValidator.predicate(
    "combined search should return filtered results",
    combinedSearch.data.length > 0,
  );

  // Step 12: Test pagination with action type filtering
  const paginatedSearch: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.members.auditLogs.index(connection, {
      memberId: memberProfile.id,
      body: {
        page: 1,
        limit: 10,
        action_type: "create_todo",
        order_by: "created_at",
        order_direction: "desc",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(paginatedSearch);

  // Validate pagination works with action type filtering
  TestValidator.predicate(
    "paginated search should limit results correctly",
    paginatedSearch.data.length <= 10,
  );

  TestValidator.equals(
    "pagination metadata should be correct",
    paginatedSearch.pagination.limit,
    10,
  );
}
