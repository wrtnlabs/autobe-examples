import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate token refresh for a newly joined platform administrator.
 *
 * This E2E scenario ensures that when a new platform admin signs up using the
 * join endpoint, they receive a valid authorization payload with access and
 * refresh tokens, and that the refresh endpoint can be used immediately to
 * obtain a rotated token pair while preserving the admin identity and account
 * status semantics.
 *
 * Business flow:
 *
 * 1. Call POST /auth/platformAdmin/join to create a new platform admin and start
 *    an authenticated session.
 * 2. Extract the refresh token and admin profile from the join response.
 * 3. Call POST /auth/platformAdmin/refresh with the refresh token and realistic
 *    session metadata (href, referrer, ip).
 * 4. Validate that the refreshed payload describes the same admin account (id,
 *    username, email, displayName, accountStatus) and indicates an active
 *    login-allowed status.
 * 5. Validate that access/refresh tokens are rotated (changed) and their
 *    expiration timestamps are in the future.
 * 6. Validate account lifecycle timestamps (createdAt, updatedAt, deletedAt) are
 *    consistent and reflect an active, non-deleted account.
 */
export async function test_api_platform_admin_token_refresh_after_join(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator using join API
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(12)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://example.com/landing/platform-admin",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const joined = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(joined);

  const originalToken: IAuthorizationToken = joined.token;
  const originalStatus: ICommunityPlatformAccountStatus.ISummary =
    joined.accountStatus;

  // Basic sanity checks on join response
  TestValidator.equals("joined id is non-empty", joined.id.length > 0, true);
  TestValidator.equals(
    "joined email matches request",
    joined.email,
    joinBody.email,
  );

  // 2. Prepare a refresh request body
  const refreshBody = {
    refreshToken: originalToken.refresh,
    href: "https://admin.example.com/console",
    referrer: "https://admin.example.com/dashboard",
  } satisfies ICommunityPlatformPlatformadmin.IRefresh;

  // 3. Call refresh endpoint
  const refreshed = await api.functional.auth.platformAdmin.refresh(
    connection,
    { body: refreshBody },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(refreshed);

  const refreshedToken: IAuthorizationToken = refreshed.token;
  const refreshedStatus: ICommunityPlatformAccountStatus.ISummary =
    refreshed.accountStatus;

  // 4. Profile consistency checks
  TestValidator.equals(
    "admin id remains stable after refresh",
    refreshed.id,
    joined.id,
  );
  TestValidator.equals(
    "username remains stable after refresh",
    refreshed.username,
    joined.username,
  );
  TestValidator.equals(
    "email remains stable after refresh",
    refreshed.email,
    joined.email,
  );
  TestValidator.equals(
    "displayName remains stable after refresh",
    refreshed.displayName,
    joined.displayName,
  );

  // Account status consistency
  TestValidator.equals(
    "accountStatus id stable after refresh",
    refreshedStatus.id,
    originalStatus.id,
  );
  TestValidator.equals(
    "accountStatus code stable after refresh",
    refreshedStatus.code,
    originalStatus.code,
  );
  TestValidator.equals(
    "accountStatus isLoginAllowed remains true",
    refreshedStatus.isLoginAllowed,
    true,
  );

  // deletedAt is null or undefined (active account)
  TestValidator.predicate(
    "joined.deletedAt is null or undefined (active account)",
    joined.deletedAt === null || joined.deletedAt === undefined,
  );
  TestValidator.predicate(
    "refreshed.deletedAt is null or undefined (active account)",
    refreshed.deletedAt === null || refreshed.deletedAt === undefined,
  );

  // 5. Token rotation semantics
  TestValidator.notEquals(
    "access token is rotated on refresh",
    refreshedToken.access,
    originalToken.access,
  );
  TestValidator.notEquals(
    "refresh token is rotated on refresh",
    refreshedToken.refresh,
    originalToken.refresh,
  );

  TestValidator.predicate(
    "new access token is non-empty",
    refreshedToken.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token is non-empty",
    refreshedToken.refresh.length > 0,
  );

  // 6. Expiration semantics - parse as Date and compare with now
  const now = new Date();

  const joinedAccessExpiry = new Date(originalToken.expired_at);
  const joinedRefreshExpiry = new Date(originalToken.refreshable_until);
  const refreshedAccessExpiry = new Date(refreshedToken.expired_at);
  const refreshedRefreshExpiry = new Date(refreshedToken.refreshable_until);

  TestValidator.predicate(
    "joined access token expiry is in the future",
    joinedAccessExpiry.getTime() >= now.getTime(),
  );
  TestValidator.predicate(
    "joined refresh token expiry is in the future",
    joinedRefreshExpiry.getTime() >= now.getTime(),
  );

  TestValidator.predicate(
    "refreshed access token expiry is in the future",
    refreshedAccessExpiry.getTime() >= now.getTime(),
  );
  TestValidator.predicate(
    "refreshed refresh token expiry is in the future",
    refreshedRefreshExpiry.getTime() >= now.getTime(),
  );

  TestValidator.predicate(
    "refreshed access expiry is not earlier than joined",
    refreshedAccessExpiry.getTime() >= joinedAccessExpiry.getTime(),
  );
  TestValidator.predicate(
    "refreshed refresh expiry is not earlier than joined",
    refreshedRefreshExpiry.getTime() >= joinedRefreshExpiry.getTime(),
  );

  // 7. Account lifecycle timestamps
  const joinedCreatedAt = new Date(joined.createdAt);
  const joinedUpdatedAt = new Date(joined.updatedAt);
  const refreshedCreatedAt = new Date(refreshed.createdAt);
  const refreshedUpdatedAt = new Date(refreshed.updatedAt);

  TestValidator.predicate(
    "joined.createdAt is not in the future",
    joinedCreatedAt.getTime() <= now.getTime(),
  );
  TestValidator.equals(
    "createdAt remains stable after refresh",
    refreshedCreatedAt.toISOString(),
    joinedCreatedAt.toISOString(),
  );
  TestValidator.predicate(
    "refreshed.updatedAt is not earlier than joined.updatedAt",
    refreshedUpdatedAt.getTime() >= joinedUpdatedAt.getTime(),
  );
}
