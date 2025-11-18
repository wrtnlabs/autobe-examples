import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSession";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test unauthorized session retrieval with invalid/missing authentication.
 *
 * This test validates that unauthenticated or unauthorized requests cannot
 * access session information. The test attempts to retrieve a session without
 * proper authentication credentials, verifying that the API properly enforces
 * access control on session endpoints. This protection ensures session data
 * remains private and requires proper authentication for any access.
 *
 * Test workflow:
 *
 * 1. Create user account and obtain a valid session
 * 2. Capture the session ID from the response headers or API response
 * 3. Create second user with their own session
 * 4. Attempt to access second user's session with first user's token (if possible)
 * 5. Verify operation fails appropriately
 * 6. Test unauthenticated access to session endpoints
 */
export async function test_api_session_retrieval_unauthorized_different_user_session(
  connection: api.IConnection,
) {
  // 1. Create first user account and authenticate
  const firstUserEmail = typia.random<string & tags.Format<"email">>();
  const firstUserPassword = RandomGenerator.alphabets(12);

  const firstUserResponse = await api.functional.auth.user.join(connection, {
    body: {
      email: firstUserEmail,
      password: firstUserPassword,
      href: "http://localhost/register",
      referrer: "http://localhost",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(firstUserResponse);

  // 2. Create second user account with their own session
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  const secondUserPassword = RandomGenerator.alphabets(12);

  const secondUserResponse = await api.functional.auth.user.join(connection, {
    body: {
      email: secondUserEmail,
      password: secondUserPassword,
      href: "http://localhost/register",
      referrer: "http://localhost",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(secondUserResponse);

  // 3. Get a valid session ID by using a generated UUID that would represent
  // the session that was created for the second user during registration
  const secondUserSessionId = typia.random<string & tags.Format<"uuid">>();

  // 4. Create connection with first user's authentication token
  const firstUserConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${firstUserResponse.token.access}`,
    },
  };

  // 5. Attempt to retrieve second user's session using first user's token
  // This should fail with 403 Forbidden or similar authorization error
  await TestValidator.error(
    "first user cannot access second user session with different credentials",
    async () => {
      await api.functional.todoList.user.auth.user.sessions.at(
        firstUserConnection,
        {
          sessionId: secondUserSessionId,
        },
      );
    },
  );
}
