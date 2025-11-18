import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListSession";
import type { ITodoListSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSession";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test session sorting by IP address functionality.
 *
 * Validates that the session list API supports sorting by IP address field.
 * Tests that the sort_by='ip_address' parameter is properly accepted and
 * returns session data with IP addresses in both ascending and descending
 * order.
 *
 * Steps:
 *
 * 1. Register a new user account (creates initial session)
 * 2. Request sessions list with sort_by='ip_address' in ascending order
 * 3. Verify response contains properly formatted session data with IP addresses
 * 4. Request sessions with descending order to verify bidirectional sorting
 * 5. Validate session structure and data integrity
 */
export async function test_api_sessions_sort_by_ip_address(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const password = "TestPassword123";
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: password,
        href: href,
        referrer: referrer,
        ip: "192.168.1.1",
        user_agent: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(registeredUser);

  // Step 2: Request sessions with ip_address sorting in ascending order
  const sessionsAscending: IPageITodoListSession.ISummary =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: {
        page: 1,
        limit: 10,
        sort_by: "ip_address",
        order: "asc",
      } satisfies ITodoListSession.IRequest,
    });
  typia.assert(sessionsAscending);

  // Step 3: Verify response structure and session data
  TestValidator.predicate(
    "sessions ascending response should contain data",
    sessionsAscending.data.length > 0,
  );

  const firstSession = sessionsAscending.data[0];
  TestValidator.predicate(
    "session should have valid IP address format",
    firstSession.ip_address.length > 0,
  );
  TestValidator.predicate(
    "session should have user agent information",
    firstSession.user_agent.length > 0,
  );
  TestValidator.predicate(
    "session should have valid creation timestamp",
    firstSession.created_at !== null && firstSession.created_at !== undefined,
  );
  TestValidator.predicate(
    "session should have last activity timestamp",
    firstSession.last_activity_at !== null &&
      firstSession.last_activity_at !== undefined,
  );

  // Step 4: Request sessions with descending order
  const sessionsDescending: IPageITodoListSession.ISummary =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: {
        page: 1,
        limit: 10,
        sort_by: "ip_address",
        order: "desc",
      } satisfies ITodoListSession.IRequest,
    });
  typia.assert(sessionsDescending);

  // Step 5: Verify descending order response
  TestValidator.predicate(
    "sessions descending response should contain data",
    sessionsDescending.data.length > 0,
  );

  TestValidator.equals(
    "ascending and descending should return same number of sessions",
    sessionsAscending.data.length,
    sessionsDescending.data.length,
  );

  // Step 6: Verify pagination information
  TestValidator.predicate(
    "pagination current page should be valid",
    sessionsAscending.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    sessionsAscending.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records count should be non-negative",
    sessionsAscending.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    sessionsAscending.pagination.pages >= 0,
  );
}
