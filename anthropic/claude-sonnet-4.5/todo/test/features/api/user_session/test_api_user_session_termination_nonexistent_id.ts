import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Test error handling when attempting to terminate a session with a
 * non-existent session ID.
 *
 * This test validates that the system properly handles requests to terminate
 * sessions that do not exist in the database. It ensures robust error handling
 * for invalid session references by:
 *
 * 1. Creating a new user account and authenticating (establishing a valid session
 *    context)
 * 2. Generating a valid UUID format that does not correspond to any existing
 *    session
 * 3. Attempting to terminate the non-existent session
 * 4. Validating that the operation fails with an appropriate error response
 *
 * This test is critical for security as it ensures users cannot manipulate
 * session termination with arbitrary UUIDs and that the system provides proper
 * error feedback when invalid session IDs are provided.
 */
export async function test_api_user_session_termination_nonexistent_id(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account and authenticate
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const registrationData = {
    email: userEmail,
    password: userPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const authenticatedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registrationData,
    });
  typia.assert(authenticatedUser);

  // Step 2: Generate a valid UUID that does not exist in the database
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to terminate the non-existent session and expect an error
  await TestValidator.error(
    "terminating non-existent session should fail",
    async () => {
      await api.functional.todoList.user.users.me.sessions.erase(connection, {
        sessionId: nonExistentSessionId,
      });
    },
  );
}
