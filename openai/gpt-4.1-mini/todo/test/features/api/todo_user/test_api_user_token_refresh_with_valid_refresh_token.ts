import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test the JWT token refresh mechanism for member users in the todo_users
 * system.
 *
 * This test performs the following steps:
 *
 * 1. Registers a new member user by calling the /auth/user/join API to create a
 *    fresh user context.
 * 2. Extracts the refresh token from the join response.
 * 3. Uses the refresh token to call the /auth/user/refresh API endpoint.
 * 4. Validates that new authorization tokens (access and refresh) are issued,
 *    confirming the correct token lifecycle handling.
 * 5. Confirms that the user information returned from the refresh API matches the
 *    originally registered user.
 *
 * This scenario ensures secure and seamless JWT token renewal without requiring
 * user re-login.
 */
export async function test_api_user_token_refresh_with_valid_refresh_token(
  connection: api.IConnection,
) {
  // Step 1: Register a new member user
  const createUserBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoUser.ICreate;
  const joinResponse: ITodoUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: createUserBody,
    });
  typia.assert(joinResponse);

  // Step 2: Extract refresh token from join response
  const refreshToken = joinResponse.token.refresh;
  typia.assert(refreshToken);

  // Step 3: Use refresh token to call the refresh API
  const refreshBody = {
    refreshToken: refreshToken,
  } satisfies ITodoUser.IRefresh;
  const refreshResponse: ITodoUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshResponse);

  // Step 4: Validate new tokens issued are different from old tokens
  TestValidator.notEquals(
    "access token differs after refresh",
    joinResponse.token.access,
    refreshResponse.token.access,
  );
  TestValidator.notEquals(
    "refresh token differs after refresh",
    joinResponse.token.refresh,
    refreshResponse.token.refresh,
  );

  // Step 5: Confirm user IDs match
  TestValidator.equals(
    "user ID matches after refresh",
    joinResponse.id,
    refreshResponse.id,
  );
}
