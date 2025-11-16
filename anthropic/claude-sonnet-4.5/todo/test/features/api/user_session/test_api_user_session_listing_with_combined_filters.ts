import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserSession";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Test the session listing with multiple filter parameters applied
 * simultaneously.
 *
 * This test validates the robustness of the filtering system when multiple
 * criteria are combined. It ensures that:
 *
 * 1. A user creates an account and authenticates
 * 2. Multiple sessions are created with varying characteristics (different times,
 *    IP addresses)
 * 3. The user retrieves sessions with combined filters (IP address + date range +
 *    sorting + pagination)
 * 4. All filter criteria are applied correctly in combination
 * 5. The response returns only sessions matching ALL specified criteria
 * 6. Pagination metadata reflects the filtered result count
 * 7. Sorting is applied to the filtered results
 * 8. Complex queries with multiple filters perform correctly and efficiently
 *
 * This validates advanced security monitoring scenarios where administrators
 * need to find specific sessions matching multiple conditions.
 */
export async function test_api_user_session_listing_with_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";
  const testHref = typia.random<string & tags.Format<"uri">>();
  const testReferrer = typia.random<string & tags.Format<"uri">>();

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: testHref,
      referrer: testReferrer,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create multiple sessions with varying IP addresses
  const ipAddresses = [
    "192.168.1.100",
    "192.168.1.101",
    "192.168.1.102",
    "10.0.0.50",
    "10.0.0.51",
  ];

  const targetIp = ipAddresses[0];
  const sessions: ITodoListUser.IAuthorized[] = [];

  // Create sessions with different IPs - sequential calls naturally produce different timestamps
  for (const ip of ipAddresses) {
    const session = await api.functional.auth.user.login(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        ip: ip,
        href: testHref,
        referrer: testReferrer,
      } satisfies ITodoListUser.ILogin,
    });
    typia.assert(session);
    sessions.push(session);
  }

  // Step 3: Retrieve all sessions first to establish baseline
  const allSessionsResponse =
    await api.functional.todoList.user.users.sessions.index(connection, {
      userId: user.id,
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(allSessionsResponse);

  // Step 4: Apply combined filters - IP address + date range + sorting + pagination
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

  const filteredResponse =
    await api.functional.todoList.user.users.sessions.index(connection, {
      userId: user.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "desc",
        ip: targetIp,
        created_after: oneHourAgo.toISOString(),
        created_before: oneHourFromNow.toISOString(),
      } satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(filteredResponse);

  // Step 5: Validate that all filter criteria are applied correctly
  TestValidator.predicate(
    "filtered sessions should only contain target IP",
    filteredResponse.data.every((session) => session.ip === targetIp),
  );

  // Step 6: Verify pagination metadata reflects filtered results
  TestValidator.predicate(
    "pagination records should match data length",
    filteredResponse.pagination.records >= filteredResponse.data.length,
  );

  TestValidator.predicate(
    "current page should be 1",
    filteredResponse.pagination.current === 1,
  );

  // Step 7: Verify sorting is applied correctly (descending by created_at)
  if (filteredResponse.data.length > 1) {
    for (let i = 0; i < filteredResponse.data.length - 1; i++) {
      const current = new Date(filteredResponse.data[i].created_at);
      const next = new Date(filteredResponse.data[i + 1].created_at);

      TestValidator.predicate(
        `session at index ${i} should be newer than session at index ${i + 1}`,
        current >= next,
      );
    }
  }

  // Step 8: Test pagination with combined filters
  const paginatedResponse =
    await api.functional.todoList.user.users.sessions.index(connection, {
      userId: user.id,
      body: {
        page: 1,
        limit: 2,
        sort_by: "created_at",
        order: "asc",
        ip: targetIp,
      } satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(paginatedResponse);

  TestValidator.predicate(
    "paginated response should respect limit",
    paginatedResponse.data.length <= 2,
  );

  TestValidator.predicate(
    "paginated sessions should only contain target IP",
    paginatedResponse.data.every((session) => session.ip === targetIp),
  );

  // Verify ascending sort order
  if (paginatedResponse.data.length > 1) {
    for (let i = 0; i < paginatedResponse.data.length - 1; i++) {
      const current = new Date(paginatedResponse.data[i].created_at);
      const next = new Date(paginatedResponse.data[i + 1].created_at);

      TestValidator.predicate(
        `session at index ${i} should be older than or equal to session at index ${i + 1}`,
        current <= next,
      );
    }
  }
}
