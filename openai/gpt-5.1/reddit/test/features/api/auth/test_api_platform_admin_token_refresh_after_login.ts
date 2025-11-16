import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate platform admin JWT refresh after login.
 *
 * This scenario provisions a fresh platform administrator account, logs in to
 * obtain JWT tokens, then performs a token refresh using the refresh token
 * returned from login. It asserts that identity and account profile fields stay
 * stable while JWT tokens and their expiry metadata are rotated.
 *
 * Steps:
 *
 * 1. Join: create a new platform admin via /auth/platformAdmin/join with
 *    ICommunityPlatformPlatformadmin.IJoin, capturing the resulting
 *    ICommunityPlatformPlatformadmin.IAuthorized payload.
 * 2. Login: authenticate the same admin via /auth/platformAdmin/login using
 *    ICommunityPlatformPlatformadmin.ILogin (identifier + password + href +
 *    referrer) and capture the login-time IAuthorizationToken and profile.
 * 3. Refresh: call /auth/platformAdmin/refresh with
 *    ICommunityPlatformPlatformadmin.IRefresh, passing the login refresh token
 *    and realistic connection context (ip, href, referrer).
 * 4. Validate identity stability: ensure that id, username, email, displayName,
 *    accountStatus (all summary fields), createdAt, updatedAt, and deletedAt
 *    are identical between login and refresh responses.
 * 5. Validate token rotation: ensure that access and refresh token strings are
 *    different between login and refresh, while new expiry timestamps are
 *    strictly later than the originals.
 * 6. Only happy-path behavior is covered; no invalid or expired token flows are
 *    tested here.
 */
export async function test_api_platform_admin_token_refresh_after_login(
  connection: api.IConnection,
) {
  // 1. Join: create a new platform admin with realistic data
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/signup",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const joined: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // 2. Login: authenticate with identifier (username) and password
  const loginBody = {
    identifier: joinBody.username,
    password: joinBody.password,
    href: "https://admin.console.example.com/login",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const loggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  // Keep original token and profile snapshot from login
  const originalToken: IAuthorizationToken = loggedIn.token;
  const originalProfile = {
    id: loggedIn.id,
    username: loggedIn.username,
    email: loggedIn.email,
    displayName: loggedIn.displayName,
    accountStatus: loggedIn.accountStatus,
    createdAt: loggedIn.createdAt,
    updatedAt: loggedIn.updatedAt,
    deletedAt: loggedIn.deletedAt,
  };

  // 3. Refresh: call refresh API using login refresh token
  const refreshBody = {
    refreshToken: originalToken.refresh,
    ip: "203.0.113.10",
    href: "https://admin.console.example.com/refresh",
    referrer: "https://admin.console.example.com/dashboard",
  } satisfies ICommunityPlatformPlatformadmin.IRefresh;

  const refreshed: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  // 4. Identity & profile must remain stable between login and refresh
  TestValidator.equals(
    "platform admin id should be unchanged after refresh",
    refreshed.id,
    originalProfile.id,
  );
  TestValidator.equals(
    "platform admin username should be unchanged after refresh",
    refreshed.username,
    originalProfile.username,
  );
  TestValidator.equals(
    "platform admin email should be unchanged after refresh",
    refreshed.email,
    originalProfile.email,
  );
  TestValidator.equals(
    "platform admin displayName should be unchanged after refresh",
    refreshed.displayName,
    originalProfile.displayName,
  );
  TestValidator.equals(
    "platform admin accountStatus summary should be unchanged after refresh",
    refreshed.accountStatus,
    originalProfile.accountStatus,
  );
  TestValidator.equals(
    "platform admin createdAt should be unchanged after refresh",
    refreshed.createdAt,
    originalProfile.createdAt,
  );
  TestValidator.equals(
    "platform admin updatedAt should be unchanged after refresh",
    refreshed.updatedAt,
    originalProfile.updatedAt,
  );
  TestValidator.equals(
    "platform admin deletedAt should be unchanged after refresh",
    refreshed.deletedAt,
    originalProfile.deletedAt,
  );

  // 5. Token rotation: access/refresh tokens must change
  const refreshedToken: IAuthorizationToken = refreshed.token;

  TestValidator.notEquals(
    "access token must change after refresh",
    refreshedToken.access,
    originalToken.access,
  );
  TestValidator.notEquals(
    "refresh token must change after refresh",
    refreshedToken.refresh,
    originalToken.refresh,
  );

  // 6. Expiry times should move forward (later than original)
  const originalAccessExpiry = new Date(originalToken.expired_at).getTime();
  const newAccessExpiry = new Date(refreshedToken.expired_at).getTime();
  const originalRefreshExpiry = new Date(
    originalToken.refreshable_until,
  ).getTime();
  const newRefreshExpiry = new Date(refreshedToken.refreshable_until).getTime();

  TestValidator.predicate(
    "refreshed access token expiry must be later than original",
    newAccessExpiry > originalAccessExpiry,
  );
  TestValidator.predicate(
    "refreshed refresh token expiry must be later than original",
    newRefreshExpiry > originalRefreshExpiry,
  );
}
