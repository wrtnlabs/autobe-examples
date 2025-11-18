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
 * Validates retrieval of all user sessions without filters.
 *
 * Tests the session list endpoint functionality with default pagination
 * settings. Verifies that:
 *
 * - User registration creates an initial authenticated session
 * - Session list endpoint returns paginated results with default values
 * - The initial session appears in the results
 * - The session belongs to the registered user
 * - All session fields are properly populated
 *
 * Steps:
 *
 * 1. Register a new user (automatically creates initial session)
 * 2. Call session list endpoint with empty request body (default pagination, no
 *    filters)
 * 3. Validate response structure includes pagination and data
 * 4. Verify initial session is included in results
 * 5. Confirm session belongs to the registered user and is active
 */
export async function test_api_sessions_list_all_without_filters(
  connection: api.IConnection,
) {
  // Step 1: Register a new user (creates initial session)
  const email = typia.random<string & tags.Format<"email">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const userResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: email,
        password: "SecurePassword123",
        href: href,
        referrer: referrer,
        ip: "127.0.0.1",
        user_agent: "Test Browser/1.0",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(userResponse);

  const userId = userResponse.id;

  // Step 2: Call session list endpoint with empty/minimal request body
  const sessionListResponse: IPageITodoListSession.ISummary =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: {} satisfies ITodoListSession.IRequest,
    });
  typia.assert(sessionListResponse);

  // Step 3: Validate response structure includes pagination and data
  TestValidator.predicate(
    "pagination metadata exists in response",
    sessionListResponse.pagination !== null &&
      sessionListResponse.pagination !== undefined,
  );

  // Step 4: Verify data array exists and contains at least one session
  TestValidator.predicate(
    "session data array contains at least one session",
    Array.isArray(sessionListResponse.data) &&
      sessionListResponse.data.length >= 1,
  );

  // Step 5: Validate the initial session from registration
  const initialSession: ITodoListSession.ISummary = sessionListResponse.data[0];
  typia.assert(initialSession);

  TestValidator.equals(
    "session user_id matches registered user",
    initialSession.todo_list_user_id,
    userId,
  );

  TestValidator.predicate(
    "initial session is active (no expiration)",
    initialSession.expired_at === null ||
      initialSession.expired_at === undefined,
  );
}
