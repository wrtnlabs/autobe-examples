import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate the full lifecycle of user session token refresh for authenticated
 * users.
 *
 * This test covers the workflow of user registration, login to obtain refresh
 * token, and session token renewal via the refresh endpoint. It checks proper
 * access/refresh token issuance, rotation, lifetime and security, and error
 * handling when refresh tokens are misused or invalid.
 *
 * Steps:
 *
 * 1. Register (join) a new user
 * 2. Login to receive access/refresh tokens
 * 3. Successfully refresh tokens using the original refresh token
 * 4. Confirm new access/refresh tokens differ from previous ones
 * 5. Confirm that user session remains valid with new token set
 * 6. Attempt refresh with an invalid/modified refresh token (assert error)
 * 7. (Optional) Test refresh after token expiry/revocation (simulate, if possible)
 */
export async function test_api_user_token_refresh_lifecycle(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(12);
  const displayName: string = RandomGenerator.name();
  const href: string = "https://test-client.com/join";
  const referrer: string = "https://test-client.com/";

  const joinResult = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
      display_name: displayName,
      href,
      referrer,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(joinResult);
  TestValidator.equals("join returns expected email", joinResult.email, email);
  TestValidator.equals(
    "join returns expected display name",
    joinResult.display_name,
    displayName,
  );
  const initialAccessToken = joinResult.token.access;
  const initialRefreshToken = joinResult.token.refresh;
  typia.assert<IAuthorizationToken>(joinResult.token);

  // 2. User login to get fresh tokens (simulate standard login flow)
  // (Assumes email verification, if required, is complete.)
  const loginResult = await api.functional.auth.user.login(connection, {
    body: {
      email,
      password,
      href: "https://test-client.com/login",
      referrer: "https://test-client.com/",
    } satisfies ICommunityPlatformUser.ILogin,
  });
  typia.assert(loginResult);
  TestValidator.equals(
    "login returns expected email",
    loginResult.email,
    email,
  );
  TestValidator.equals(
    "login returns expected display name",
    loginResult.display_name,
    displayName,
  );
  const loginAccessToken = loginResult.token.access;
  const loginRefreshToken = loginResult.token.refresh;
  typia.assert<IAuthorizationToken>(loginResult.token);

  // 3. Use the login refresh token to request new tokens
  const refreshResult = await api.functional.auth.user.refresh(connection, {
    body: {
      refresh_token: loginRefreshToken,
      href: "https://test-client.com/refresh",
      referrer: "https://test-client.com/",
    } satisfies ICommunityPlatformUser.IRefresh,
  });
  typia.assert(refreshResult);
  TestValidator.equals(
    "refresh returns expected user id",
    refreshResult.id,
    loginResult.id,
  );
  TestValidator.notEquals(
    "access tokens differ after refresh",
    refreshResult.token.access,
    loginAccessToken,
  );
  TestValidator.notEquals(
    "refresh tokens differ after refresh",
    refreshResult.token.refresh,
    loginRefreshToken,
  );
  typia.assert<IAuthorizationToken>(refreshResult.token);

  // 4. Confirm authorized session continues with new token (simulated as SDK updates connection.headers)
  // Further API tests would regenerate full session but are out of the scope for this token-specific scenario.

  // 5. Negative test: Try to refresh with a tampered refresh token (should fail)
  const tamperedToken = loginRefreshToken.slice(0, -2) + "xx";
  await TestValidator.error(
    "refresh with invalid token must fail",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: tamperedToken,
          href: "https://test-client.com/refresh",
          referrer: "https://test-client.com/",
        } satisfies ICommunityPlatformUser.IRefresh,
      });
    },
  );
}
