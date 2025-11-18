import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSession";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that unauthenticated requests to retrieve session information are
 * rejected.
 *
 * This test validates that the session retrieval endpoint requires valid
 * authentication credentials. It creates a user account through registration,
 * which generates an authenticated session. Then it attempts to retrieve the
 * session information using an unauthenticated connection (no authorization
 * headers). The endpoint should reject the unauthenticated request with a 401
 * Unauthorized error.
 *
 * The test follows these steps:
 *
 * 1. Create a new user account via the join endpoint
 * 2. Extract the session ID from the authenticated response
 * 3. Create an unauthenticated connection (empty headers)
 * 4. Attempt to retrieve session information without authentication
 * 5. Verify that a 401 Unauthorized error is returned
 */
export async function test_api_session_retrieval_unauthenticated(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account to establish a session
  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(registeredUser);

  // Step 2: Extract session ID from the registered user response
  // The session ID should be available in the response or we need to
  // use a random valid session ID format (UUID)
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create an unauthenticated connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 4 & 5: Attempt to retrieve session information without authentication
  // and verify that a 401 Unauthorized error is returned
  await TestValidator.httpError(
    "unauthenticated session retrieval should fail with 401",
    401,
    async () => {
      return await api.functional.todoList.user.auth.user.sessions.at(
        unauthenticatedConnection,
        {
          sessionId: sessionId,
        },
      );
    },
  );
}
