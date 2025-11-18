import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates that the Todo List user profile endpoint denies access when JWT
 * authentication is missing or invalid.
 *
 * 1. Register a new user and extract the userId and issued access token
 * 2. Attempt to access the profile endpoint without any authentication token
 *    (empty headers)
 * 3. Attempt to access the profile endpoint with a deliberately invalid token
 *    string
 * 4. For both cases, assert that an authentication/authorization error is thrown
 *    and no user profile data is returned
 * 5. Ensure error assertions use correct await for async callbacks, and avoid any
 *    type error or header mutation
 */
export async function test_api_user_profile_retrieval_with_invalid_token(
  connection: api.IConnection,
) {
  // 1. Register a new user and get userId
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const href = "https://example.com/register";
  const referrer = "https://example.com/";
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
      href,
      referrer,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // 2. Create unauthenticated connection (empty headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3. Try to access the user profile with no token
  await TestValidator.error(
    "access denied with missing authentication token",
    async () => {
      await api.functional.todoList.user.users.at(unauthConn, {
        userId: user.id,
      });
    },
  );

  // 4. Create connection with an invalid/garbage token
  const invalidToken = RandomGenerator.alphaNumeric(32);
  const tamperedConn: api.IConnection = {
    ...connection,
    headers: {
      ...(connection.headers ?? {}),
      // Use a random string as the Authorization header
      Authorization: invalidToken,
    },
  };

  // 5. Try to access the user profile with invalid token
  await TestValidator.error(
    "access denied with invalid authentication token",
    async () => {
      await api.functional.todoList.user.users.at(tamperedConn, {
        userId: user.id,
      });
    },
  );
}
