import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate the memberUser token refresh flow immediately after a successful
 * login.
 *
 * Business goal
 *
 * - Ensure that a community platform member user who has already logged in can
 *   renew their JWT token bundle using the refresh token returned from login.
 * - Confirm that account identity and status flags stay consistent across join,
 *   login, and refresh, while token strings themselves are rotated.
 *
 * High-level scenario
 *
 * 1. Register a fresh member user via join (POST /auth/memberUser/join).
 * 2. Log in with the same credentials via login (POST /auth/memberUser/login).
 * 3. Extract the refresh token from the login response.
 * 4. Call refresh (POST /auth/memberUser/refresh) using that refresh token.
 * 5. Validate identity, status flags, and token rotation behavior between login
 *    and refresh responses.
 */
export async function test_api_memberuser_refresh_after_login(
  connection: api.IConnection,
) {
  // 1. Register a fresh member user via join
  const username: string = RandomGenerator.name(1);
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(12);

  const joinBody = {
    username,
    email,
    password,
    ip: null,
    href: "https://client.example.com/auth/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const joinAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joinAuthorized);

  const joinToken: IAuthorizationToken = joinAuthorized.token;
  typia.assert(joinToken);

  // 2. Log in with the same credentials via login
  const loginBody = {
    identifier: email,
    password,
    ip: null,
    href: "https://client.example.com/auth/login",
    referrer: "https://client.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const loginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginBody,
    });
  typia.assert(loginAuthorized);

  const loginToken: IAuthorizationToken = loginAuthorized.token;
  typia.assert(loginToken);

  // 3. Validate identity consistency between join and login
  TestValidator.equals(
    "memberUser id must be consistent between join and login",
    loginAuthorized.id,
    joinAuthorized.id,
  );
  TestValidator.equals(
    "memberUser username must be consistent between join and login",
    loginAuthorized.username,
    joinAuthorized.username,
  );
  TestValidator.equals(
    "memberUser email must be consistent between join and login",
    loginAuthorized.email,
    joinAuthorized.email,
  );

  // failed_login_count sanity: non-negative integer
  TestValidator.predicate(
    "failed_login_count after login is non-negative",
    loginAuthorized.failed_login_count >= 0,
  );

  // 4. Extract refresh token from login response
  const refreshToken: string = loginToken.refresh;
  TestValidator.predicate(
    "login refresh token must be a non-empty string",
    refreshToken.length > 0,
  );

  // 5. Call refresh using the extracted refresh token
  const refreshBody = {
    refreshToken,
    ip: null,
    href: "https://client.example.com/auth/refresh",
    referrer: "https://client.example.com/app/dashboard",
  } satisfies ICommunityPlatformMemberuser.IRefresh;

  const refreshAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshAuthorized);

  const refreshTokenBundle: IAuthorizationToken = refreshAuthorized.token;
  typia.assert(refreshTokenBundle);

  // 6. Validate identity and status semantics for refreshed authorization
  TestValidator.equals(
    "memberUser id must be consistent between login and refresh",
    refreshAuthorized.id,
    loginAuthorized.id,
  );
  TestValidator.equals(
    "memberUser username must be consistent between login and refresh",
    refreshAuthorized.username,
    loginAuthorized.username,
  );
  TestValidator.equals(
    "memberUser email must be consistent between login and refresh",
    refreshAuthorized.email,
    loginAuthorized.email,
  );

  TestValidator.equals(
    "is_email_verified must be preserved between login and refresh",
    refreshAuthorized.is_email_verified,
    loginAuthorized.is_email_verified,
  );
  TestValidator.equals(
    "is_suspended must be preserved between login and refresh",
    refreshAuthorized.is_suspended,
    loginAuthorized.is_suspended,
  );
  TestValidator.equals(
    "is_banned must be preserved between login and refresh",
    refreshAuthorized.is_banned,
    loginAuthorized.is_banned,
  );

  TestValidator.equals(
    "failed_login_count must be preserved between login and refresh",
    refreshAuthorized.failed_login_count,
    loginAuthorized.failed_login_count,
  );
  TestValidator.equals(
    "locked_until must be preserved between login and refresh",
    refreshAuthorized.locked_until,
    loginAuthorized.locked_until,
  );

  // 7. Validate token rotation between login and refresh
  TestValidator.notEquals(
    "access token should be rotated between login and refresh",
    refreshTokenBundle.access,
    loginToken.access,
  );
  TestValidator.notEquals(
    "refresh token should be rotated between login and refresh",
    refreshTokenBundle.refresh,
    loginToken.refresh,
  );

  // 8. Structural consistency of token bundles (non-empty strings)
  TestValidator.predicate(
    "login access token must be non-empty",
    loginToken.access.length > 0,
  );
  TestValidator.predicate(
    "login refresh token must be non-empty",
    loginToken.refresh.length > 0,
  );
  TestValidator.predicate(
    "refreshed access token must be non-empty",
    refreshTokenBundle.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token must be non-empty",
    refreshTokenBundle.refresh.length > 0,
  );
}
