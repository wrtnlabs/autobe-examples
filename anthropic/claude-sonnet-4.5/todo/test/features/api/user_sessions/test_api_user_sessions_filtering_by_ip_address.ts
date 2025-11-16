import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserSession";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Test administrator's ability to filter user sessions by specific IP addresses
 * for security monitoring and investigating suspicious access patterns.
 *
 * This test validates IP-based session filtering capabilities that are critical
 * for security monitoring and tracking sessions from particular locations or
 * networks.
 *
 * The test process:
 *
 * 1. Admin authenticates successfully
 * 2. Test user account is created with specific IP
 * 3. Filtering by the user's IP address returns the session
 * 4. Filtering by non-existent IP returns empty results
 * 5. IP filter works correctly in combination with pagination
 * 6. Response structure maintains consistency with paginated format
 */
export async function test_api_user_sessions_filtering_by_ip_address(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      ip: "192.168.1.100",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create test user account with specific IP
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const testIp1 = "203.0.113.10";
  const nonExistentIp = "198.51.100.99";

  // Create user with testIp1
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      ip: testIp1,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 3: Filter sessions by testIp1 and verify session is returned
  const sessionsIp1 = await api.functional.todoList.admin.users.sessions.index(
    connection,
    {
      userId: user.id,
      body: {
        ip: testIp1,
        page: 1,
        limit: 10,
      } satisfies ITodoListUserSession.IRequest,
    },
  );
  typia.assert(sessionsIp1);

  TestValidator.predicate(
    "at least one session exists for testIp1",
    sessionsIp1.data.length >= 1,
  );
  TestValidator.predicate(
    "all sessions have testIp1",
    sessionsIp1.data.every((session) => session.ip === testIp1),
  );

  // Step 4: Filter by non-existent IP and verify empty results
  const sessionsNonExistent =
    await api.functional.todoList.admin.users.sessions.index(connection, {
      userId: user.id,
      body: {
        ip: nonExistentIp,
        page: 1,
        limit: 10,
      } satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(sessionsNonExistent);

  TestValidator.equals(
    "no sessions for non-existent IP",
    sessionsNonExistent.data.length,
    0,
  );
  TestValidator.equals(
    "total records for non-existent IP",
    sessionsNonExistent.pagination.records,
    0,
  );

  // Step 5: Test IP filter with pagination
  const sessionsPaginated =
    await api.functional.todoList.admin.users.sessions.index(connection, {
      userId: user.id,
      body: {
        ip: testIp1,
        page: 1,
        limit: 1,
      } satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(sessionsPaginated);

  TestValidator.predicate(
    "paginated sessions limit respected",
    sessionsPaginated.data.length <= 1,
  );
  if (sessionsPaginated.data.length > 0) {
    TestValidator.predicate(
      "paginated session has correct IP",
      sessionsPaginated.data[0].ip === testIp1,
    );
  }

  // Step 6: Verify response structure consistency
  TestValidator.predicate(
    "pagination metadata exists",
    sessionsIp1.pagination !== null && sessionsIp1.pagination !== undefined,
  );
  TestValidator.predicate("data array exists", Array.isArray(sessionsIp1.data));

  // Step 7: Test filtering without IP to get all sessions
  const allSessions = await api.functional.todoList.admin.users.sessions.index(
    connection,
    {
      userId: user.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoListUserSession.IRequest,
    },
  );
  typia.assert(allSessions);

  TestValidator.predicate(
    "all sessions query returns results",
    allSessions.data.length >= 1,
  );
  TestValidator.predicate(
    "filtered IP sessions subset of all sessions",
    sessionsIp1.data.length <= allSessions.data.length,
  );
}
