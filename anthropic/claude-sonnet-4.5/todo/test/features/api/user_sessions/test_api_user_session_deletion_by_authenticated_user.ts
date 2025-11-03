import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test the deletion of a specific user session by an authenticated user.
 *
 * This test validates the workflow where an authenticated user deletes a
 * specific session to log out from a particular device. The test creates a new
 * user account through registration, which automatically establishes the first
 * session and provides authentication tokens. Then, using the authenticated
 * user context, it attempts to delete a session.
 *
 * Note: The current API structure does not return session IDs from registration
 * nor provides a session listing endpoint. This test validates the API endpoint
 * functionality with a generated session ID to ensure the endpoint is
 * accessible and properly authenticated.
 *
 * Test steps:
 *
 * 1. Create a new user account through registration
 * 2. Verify the registered user data
 * 3. Attempt to delete a session using the authenticated context
 */
export async function test_api_user_session_deletion_by_authenticated_user(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account through registration
  const registerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    ip: typia.random<string>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.IRegister;

  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registerData,
    });

  // Step 2: Verify the registered user data
  typia.assert(registeredUser);

  // Step 3: Attempt to delete a session using the authenticated context
  // Note: Using a random UUID as the API does not provide session IDs from registration
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  await api.functional.todoList.user.users.me.sessions.erase(connection, {
    sessionId: sessionId,
  });

  // Session deletion completes (void return indicates success or appropriate error handling)
}
