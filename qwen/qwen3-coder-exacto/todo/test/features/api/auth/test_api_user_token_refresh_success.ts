import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that a registered user can successfully refresh their JWT
 * authentication tokens using the /auth/user/refresh endpoint.
 *
 * The workflow is as follows:
 *
 * 1. Register a new user via /auth/user/join with valid, randomly generated
 *    credentials to obtain an initial set of JWT tokens.
 * 2. Extract the refresh token from the registration response
 *    (ITodoListUser.IAuthorized.token.refresh).
 * 3. Call the /auth/user/refresh endpoint with the refresh token, as per
 *    ITodoListUser.IRefresh schema.
 * 4. Validate that the response structure matches ITodoListUser.IAuthorized and
 *    that the new access and refresh tokens are returned and are different from
 *    the previous tokens.
 * 5. Optionally, check that the previous refresh token is invalid per security
 *    policy, by attempting another refresh with the old token and expecting an
 *    error.
 * 6. Confirm session continuity without requiring the user to re-login, ensuring
 *    the new tokens grant access.
 */
export async function test_api_user_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Register a new user and obtain initial tokens
  const registration = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://test.example.com/register",
      referrer: "https://test.example.com/landing",
      // ip is optional; purposely omit to let server capture if supported
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(registration);

  // 2. Extract refresh token
  const oldRefreshToken = registration.token.refresh;
  const oldAccessToken = registration.token.access;

  // 3. Call the refresh endpoint with the refresh token
  const refreshed = await api.functional.auth.user.refresh(connection, {
    body: {
      refresh_token: oldRefreshToken,
    } satisfies ITodoListUser.IRefresh,
  });
  typia.assert(refreshed);

  // 4. Validate new tokens and structure
  TestValidator.notEquals(
    "new refresh token after refresh should differ from old token",
    refreshed.token.refresh,
    oldRefreshToken,
  );
  TestValidator.notEquals(
    "new access token after refresh should differ from old token",
    refreshed.token.access,
    oldAccessToken,
  );
  TestValidator.equals(
    "user id remains the same after refresh",
    refreshed.id,
    registration.id,
  );
  TestValidator.equals(
    "email remains the same after refresh",
    refreshed.email,
    registration.email,
  );

  // 5. Optionally: Check that the previous refresh token is no longer valid (if security policy applies)
  await TestValidator.error(
    "old refresh token cannot be reused for another refresh",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: oldRefreshToken,
        } satisfies ITodoListUser.IRefresh,
      });
    },
  );

  // (No forced re-login needed since the refresh succeeded and tokens are valid)
}
