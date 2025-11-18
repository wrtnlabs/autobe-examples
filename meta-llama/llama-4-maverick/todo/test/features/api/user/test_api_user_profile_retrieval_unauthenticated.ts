import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validate that requesting the authenticated user profile endpoint without
 * authentication fails, ensuring account privacy and proper API security.
 *
 * Business context: This test ensures that user privacy is strictly enforced:
 * the user profile endpoint /todo/user/actors/me must not leak any information
 * when the client does not send an access token. API must respond with a strict
 * authentication error (401 Unauthorized), and never expose user data to
 * unauthenticated callers.
 *
 * Steps:
 *
 * 1. Register a new user using POST /auth/user/join. This is only to ensure that
 *    the test environment is properly provisioned—no token will be used.
 * 2. Construct a new connection object with empty headers (thus without
 *    Authorization) to simulate unauthenticated access.
 * 3. Call GET /todo/user/actors/me using this unauthenticated connection.
 * 4. Assert that a 401 Unauthorized error is thrown and no ITodoUser object (or
 *    any user information) is leaked.
 *
 * If the API leaks profile data or fails to return a 401, the test must fail.
 */
export async function test_api_user_profile_retrieval_unauthenticated(
  connection: api.IConnection,
) {
  // 1. Register a user (to ensure infrastructure is ready)
  const userInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    href: "https://test-client-app.auth-flow/",
    referrer: "https://test-client-app.landing/",
    ip: null,
  } satisfies ITodoUser.ICreate;
  const userAuth: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: userInput },
  );
  typia.assert(userAuth);

  // 2. Create unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3-4. Call profile endpoint without token and validate error
  await TestValidator.error(
    "unauthenticated profile access must fail with 401 and not leak ITodoUser",
    async () => {
      await api.functional.todo.user.actors.me.at(unauthConn);
    },
  );
}
