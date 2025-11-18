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
 * Test searching sessions by exact IP address match.
 *
 * This test validates that users can search and filter their authentication
 * sessions by exact IP address match. It verifies that the session search
 * endpoint correctly filters sessions when searching by a specific IP address,
 * ensuring that only sessions with matching IP addresses are returned in the
 * results.
 *
 * Steps:
 *
 * 1. Register a new user with a specific IP address
 * 2. Search sessions using the exact IP address as search parameter
 * 3. Verify the response contains only sessions with matching IP address
 * 4. Confirm pagination metadata is correct
 * 5. Validate each session's ip_address field matches the search term
 */
export async function test_api_sessions_search_by_ip_address_exact(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const specificIpAddress = "192.168.1.100";

  const userResponse = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      ip: specificIpAddress,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(userResponse);

  // Step 2: Search sessions by exact IP address
  const searchResponse =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: {
        page: 1,
        limit: 10,
        search: specificIpAddress,
      } satisfies ITodoListSession.IRequest,
    });
  typia.assert(searchResponse);

  // Step 3: Verify response structure and pagination
  TestValidator.predicate(
    "response has pagination data",
    searchResponse.pagination !== null &&
      searchResponse.pagination !== undefined,
  );

  TestValidator.predicate(
    "response has data array",
    Array.isArray(searchResponse.data),
  );

  // Step 4: Verify at least one session exists with the IP address
  TestValidator.predicate(
    "at least one session found with matching IP",
    searchResponse.data.length > 0,
  );

  // Step 5: Verify all returned sessions have the exact matching IP address
  searchResponse.data.forEach((session: ITodoListSession.ISummary) => {
    TestValidator.equals(
      "session ip_address matches search parameter",
      session.ip_address,
      specificIpAddress,
    );
  });

  // Step 6: Verify pagination metadata is valid
  TestValidator.predicate(
    "current page is valid",
    searchResponse.pagination.current >= 1,
  );

  TestValidator.predicate(
    "limit is positive",
    searchResponse.pagination.limit > 0,
  );

  TestValidator.predicate(
    "records count is valid",
    searchResponse.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pages count is valid",
    searchResponse.pagination.pages >= 0,
  );

  // Step 7: Verify session contains required fields
  if (searchResponse.data.length > 0) {
    const firstSession = searchResponse.data[0];

    TestValidator.predicate(
      "session has valid ID",
      firstSession.id !== null && firstSession.id !== undefined,
    );

    TestValidator.predicate(
      "session has user ID",
      firstSession.todo_list_user_id !== null &&
        firstSession.todo_list_user_id !== undefined,
    );

    TestValidator.predicate(
      "session has user_agent",
      firstSession.user_agent !== null && firstSession.user_agent !== undefined,
    );

    TestValidator.predicate(
      "session has created_at timestamp",
      firstSession.created_at !== null && firstSession.created_at !== undefined,
    );

    TestValidator.predicate(
      "session has last_activity_at timestamp",
      firstSession.last_activity_at !== null &&
        firstSession.last_activity_at !== undefined,
    );

    TestValidator.predicate(
      "session has absolute_timeout_at timestamp",
      firstSession.absolute_timeout_at !== null &&
        firstSession.absolute_timeout_at !== undefined,
    );
  }
}
