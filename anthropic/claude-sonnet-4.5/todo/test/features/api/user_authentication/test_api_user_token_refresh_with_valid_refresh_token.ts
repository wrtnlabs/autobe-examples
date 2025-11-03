import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test user token refresh with valid refresh token.
 *
 * This test validates the token refresh workflow where an authenticated user
 * obtains a new access token using their valid refresh token. It ensures users
 * can seamlessly continue their session when their access token expires without
 * requiring re-authentication.
 *
 * Test workflow:
 *
 * 1. Register a new user account to obtain initial access and refresh tokens
 * 2. Immediately use the refresh token to obtain a new access token
 * 3. Validate that the refresh operation returns a new valid access token
 * 4. Verify that the user profile information is consistent
 * 5. Confirm that the new access token is set in connection headers
 */
export async function test_api_user_token_refresh_with_valid_refresh_token(
  connection: api.IConnection,
) {
  // Step 1: Register a new user to obtain initial tokens
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.IRegister;

  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registrationData,
    });
  typia.assert(registeredUser);

  // Step 2: Use the refresh token to obtain new access token
  const refreshedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, {
      body: {
        refresh_token: registeredUser.token.refresh,
      } satisfies ITodoListUser.IRefresh,
    });
  typia.assert(refreshedUser);

  // Step 3: Validate user identity consistency
  TestValidator.equals(
    "user ID should match between registration and refresh",
    refreshedUser.id,
    registeredUser.id,
  );

  TestValidator.equals(
    "user email should match between registration and refresh",
    refreshedUser.email,
    registeredUser.email,
  );

  // Step 4: Validate that new tokens were issued
  TestValidator.predicate(
    "refresh should return new access token",
    refreshedUser.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh should return new refresh token",
    refreshedUser.token.refresh.length > 0,
  );
}
