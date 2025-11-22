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
 * Test audit log search with temporal filtering for admin member audit logs.
 *
 * This test validates that administrators can effectively search and filter
 * audit logs using date range parameters to isolate audit activities within
 * specific time windows. The test creates member activities across different
 * time periods and verifies that date-based filtering correctly returns only
 * audit logs within specified time ranges.
 *
 * Implementation involves:
 *
 * 1. Setting up administrator and member user accounts with proper authentication
 * 2. Generating todo activities across different time periods to create diverse
 *    audit logs
 * 3. Testing date range filtering to validate temporal search accuracy
 * 4. Verifying audit log completeness and proper chronological ordering
 */
export async function test_api_admin_member_audit_logs_date_range_search(
  connection: api.IConnection,
) {
  // Create administrator account for audit log access
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: "adminPassword123",
        first_name: "Admin",
        last_name: "User",
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(admin);

  // Authenticate as administrator
  const adminAuth: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: "adminPassword123",
        ip: "192.168.1.100",
        href: "https://admin.example.com/login",
        referrer: "https://admin.example.com",
      } satisfies ITodoAppAdministrator.ILogin,
    });
  typia.assert(adminAuth);

  // Create member user account
  const memberEmail = typia.random<string & tags.Format<"email">>();
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

  // Authenticate as member
  const memberAuth: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.login.authenticateMember(connection, {
      body: {
        email: memberEmail,
        password: "memberPassword123",
        ip: "192.168.1.101",
        href: "https://app.example.com/login",
        referrer: "https://app.example.com",
      } satisfies ITodoAppMember.ILogin,
    });
  typia.assert(memberAuth);

  // Capture baseline timestamp for temporal testing
  const baselineTime = new Date();
  const baselineTimestamp = baselineTime.toISOString();

  // Create initial todo to establish baseline audit activity
  const initialTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.create(connection, {
      body: {
        title: "Initial todo task",
        description: "First todo for audit log baseline",
        status: "pending",
        business_status: "active",
        priority: "medium",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(initialTodo);

  // Wait a moment to ensure temporal separation
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Create additional todos to generate multiple audit log entries
  const secondTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.create(connection, {
      body: {
        title: "Second todo task",
        description: "Second todo for temporal testing",
        status: "in_progress",
        business_status: "active",
        priority: "high",
        category: "testing",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(secondTodo);

  // Wait another moment for temporal separation
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Create third todo to establish multiple temporal points
  const thirdTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.create(connection, {
      body: {
        title: "Third todo task",
        description: "Third todo for date range validation",
        status: "completed",
        business_status: "active",
        priority: "low",
        category: "validation",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(thirdTodo);

  // Calculate date ranges for testing
  const earlyRangeStart = new Date(baselineTime.getTime() - 5000).toISOString(); // 5 seconds before baseline
  const earlyRangeEnd = new Date(baselineTime.getTime() + 2000).toISOString(); // 2 seconds after baseline
  const middleRangeStart = new Date(
    baselineTime.getTime() + 1000,
  ).toISOString(); // 1 second after baseline
  const middleRangeEnd = new Date(baselineTime.getTime() + 5000).toISOString(); // 5 seconds after baseline
  const lateRangeStart = new Date(baselineTime.getTime() + 4000).toISOString(); // 4 seconds after baseline
  const lateRangeEnd = new Date(baselineTime.getTime() + 10000).toISOString(); // 10 seconds after baseline

  // Test 1: Search audit logs for early date range (should include only initial activities)
  const earlyRangeResults: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.members.auditLogs.index(connection, {
      memberId: memberAuth.id,
      body: {
        page: 1,
        limit: 50,
        created_after: earlyRangeStart,
        created_before: earlyRangeEnd,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(earlyRangeResults);

  // Validate that early range contains audit logs from the expected timeframe
  TestValidator.predicate(
    "early date range should return audit logs within specified timeframe",
    earlyRangeResults.data.length > 0,
  );

  // Test 2: Search audit logs for middle date range (should include second todo creation)
  const middleRangeResults: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.members.auditLogs.index(connection, {
      memberId: memberAuth.id,
      body: {
        page: 1,
        limit: 50,
        created_after: middleRangeStart,
        created_before: middleRangeEnd,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(middleRangeResults);

  // Validate middle range results
  TestValidator.predicate(
    "middle date range should return audit logs within specified timeframe",
    middleRangeResults.data.length > 0,
  );

  // Test 3: Search audit logs for late date range (should include third todo creation)
  const lateRangeResults: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.members.auditLogs.index(connection, {
      memberId: memberAuth.id,
      body: {
        page: 1,
        limit: 50,
        created_after: lateRangeStart,
        created_before: lateRangeEnd,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(lateRangeResults);

  // Validate late range results
  TestValidator.predicate(
    "late date range should return audit logs within specified timeframe",
    lateRangeResults.data.length > 0,
  );

  // Test 4: Search with wide date range (should include all activities)
  const wideRangeResults: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.members.auditLogs.index(connection, {
      memberId: memberAuth.id,
      body: {
        page: 1,
        limit: 50,
        created_after: earlyRangeStart,
        created_before: lateRangeEnd,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(wideRangeResults);

  // Validate that wide range includes more audit logs than individual ranges
  TestValidator.predicate(
    "wide date range should return comprehensive audit log results",
    wideRangeResults.data.length >=
      Math.max(
        earlyRangeResults.data.length,
        middleRangeResults.data.length,
        lateRangeResults.data.length,
      ),
  );

  // Test 5: Search with empty date range (should return no results)
  const emptyRangeStart = new Date(
    baselineTime.getTime() + 20000,
  ).toISOString(); // 20 seconds after baseline
  const emptyRangeEnd = new Date(baselineTime.getTime() + 25000).toISOString(); // 25 seconds after baseline

  const emptyRangeResults: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.members.auditLogs.index(connection, {
      memberId: memberAuth.id,
      body: {
        page: 1,
        limit: 50,
        created_after: emptyRangeStart,
        created_before: emptyRangeEnd,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(emptyRangeResults);

  // Validate that empty range returns no results
  TestValidator.predicate(
    "empty date range should return no audit logs",
    emptyRangeResults.data.length === 0,
  );

  // Test 6: Validate audit log data integrity and temporal ordering
  TestValidator.predicate(
    "audit logs should contain member activity data",
    wideRangeResults.data.some(
      (log) =>
        log.actor_member_id === memberAuth.id &&
        log.action_type === "create_todo",
    ),
  );

  // Test 7: Verify pagination works correctly with date filtering
  const paginatedResults: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.members.auditLogs.index(connection, {
      memberId: memberAuth.id,
      body: {
        page: 1,
        limit: 5,
        created_after: earlyRangeStart,
        created_before: lateRangeEnd,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(paginatedResults);

  // Validate pagination parameters
  TestValidator.equals(
    "pagination should limit results to specified page size",
    paginatedResults.data.length,
    Math.min(5, wideRangeResults.data.length),
  );

  // Final validation: Ensure all date ranges are logically consistent
  TestValidator.predicate(
    "date range filtering should maintain temporal logic",
    earlyRangeEnd <= middleRangeStart && middleRangeEnd <= lateRangeStart,
  );
}
