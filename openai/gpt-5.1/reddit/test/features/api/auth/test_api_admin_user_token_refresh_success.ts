import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserRefresh";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";

/**
 * Validate successful adminUser token refresh using a valid refresh token.
 *
 * Business purpose: Ensures that an administrative user who has just joined the
 * platform and received an initial JWT token set can renew their session using
 * only the refresh token, without resending credentials. The test verifies that
 * identity information remains stable across refresh operations while the
 * access token is rotated, and that subsequent refresh calls using the new
 * refresh token continue to succeed.
 *
 * Steps:
 *
 * 1. Register a new adminUser via POST /auth/adminUser/join and capture the
 *    initial ICommunityPlatformAdminuser.IAuthorized payload (authorized1).
 * 2. Immediately call POST /auth/adminUser/refresh with the initial refresh token
 *    to obtain a new ICommunityPlatformAdminuser.IAuthorized payload
 *    (authorized2).
 * 3. Validate that identity fields (id, username, email, is_super_admin) remain
 *    identical between authorized1 and authorized2.
 * 4. Validate that the access token is rotated by checking that
 *    authorized2.token.access differs from authorized1.token.access.
 * 5. Optionally, perform a second refresh call using the newest refresh token to
 *    obtain authorized3, ensuring that the refresh token issued in authorized2
 *    is also valid and that identity fields remain stable while the access
 *    token continues to rotate.
 */
export async function test_api_admin_user_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Register a new adminUser and obtain the initial authorized context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const authorized1: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized1);

  const token1: IAuthorizationToken = authorized1.token;

  // 2. Refresh tokens using the initial refresh token
  const refreshBody1 = {
    refreshToken: token1.refresh,
  } satisfies ICommunityPlatformAdminUserRefresh.IRequest;

  const authorized2: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.refresh(connection, {
      body: refreshBody1,
    });
  typia.assert(authorized2);

  const token2: IAuthorizationToken = authorized2.token;

  // 3. Identity consistency checks between initial and refreshed context
  TestValidator.equals(
    "adminUser id should remain stable across first refresh",
    authorized2.id,
    authorized1.id,
  );
  TestValidator.equals(
    "adminUser username should remain stable across first refresh",
    authorized2.username,
    authorized1.username,
  );
  TestValidator.equals(
    "adminUser email should remain stable across first refresh",
    authorized2.email,
    authorized1.email,
  );
  TestValidator.equals(
    "is_super_admin flag should remain stable across first refresh",
    authorized2.is_super_admin,
    authorized1.is_super_admin,
  );

  // 4. Access token rotation check
  TestValidator.notEquals(
    "access token should be rotated on first refresh",
    token2.access,
    token1.access,
  );

  // Basic sanity checks on token metadata (non-empty strings)
  TestValidator.predicate(
    "first access token expired_at should be a non-empty string",
    token1.expired_at.length > 0,
  );
  TestValidator.predicate(
    "first access token refreshable_until should be a non-empty string",
    token1.refreshable_until.length > 0,
  );
  TestValidator.predicate(
    "second access token expired_at should be a non-empty string",
    token2.expired_at.length > 0,
  );
  TestValidator.predicate(
    "second access token refreshable_until should be a non-empty string",
    token2.refreshable_until.length > 0,
  );

  // 5. Second refresh using the latest refresh token to ensure continued validity
  const refreshBody2 = {
    refreshToken: token2.refresh,
  } satisfies ICommunityPlatformAdminUserRefresh.IRequest;

  const authorized3: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.refresh(connection, {
      body: refreshBody2,
    });
  typia.assert(authorized3);

  const token3: IAuthorizationToken = authorized3.token;

  // Identity should still be stable
  TestValidator.equals(
    "adminUser id should remain stable across second refresh",
    authorized3.id,
    authorized1.id,
  );
  TestValidator.equals(
    "adminUser username should remain stable across second refresh",
    authorized3.username,
    authorized1.username,
  );
  TestValidator.equals(
    "adminUser email should remain stable across second refresh",
    authorized3.email,
    authorized1.email,
  );
  TestValidator.equals(
    "is_super_admin flag should remain stable across second refresh",
    authorized3.is_super_admin,
    authorized1.is_super_admin,
  );

  // Access token should keep rotating across each refresh
  TestValidator.notEquals(
    "access token should be rotated on second refresh (different from first)",
    token3.access,
    token1.access,
  );
  TestValidator.notEquals(
    "access token should be rotated on second refresh (different from second)",
    token3.access,
    token2.access,
  );
}
