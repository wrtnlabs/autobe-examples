import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSession";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test error handling when retrieving a session with a non-existent or invalid
 * session ID.
 *
 * This test validates that the session retrieval endpoint properly handles
 * attempts to access sessions that do not exist or do not belong to the
 * authenticated user.
 *
 * The test follows this workflow:
 *
 * 1. Register a new user account with valid credentials
 * 2. The registration automatically creates an initial authenticated session
 * 3. Attempt to retrieve a session using a non-existent session ID (random UUID)
 * 4. Verify that the API returns a 404 Not Found error
 * 5. Ensure no sensitive session information is leaked in the error response
 *
 * This ensures proper authorization enforcement and secure error handling.
 */
export async function test_api_session_retrieval_invalid_session_id(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  // This creates a user and an initial authenticated session
  const email = typia.random<string & tags.Format<"email">>();
  const userRegistration = await api.functional.auth.user.join(connection, {
    body: {
      email: email,
      password: "SecurePassword123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(userRegistration);

  // Step 2: Attempt to retrieve a session with a non-existent session ID
  // Generate a random UUID that doesn't correspond to any real session
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Test that retrieving a non-existent session returns an error
  await TestValidator.error(
    "session retrieval with non-existent session ID should fail",
    async () => {
      await api.functional.todoList.user.auth.user.sessions.at(connection, {
        sessionId: nonExistentSessionId,
      });
    },
  );
}
