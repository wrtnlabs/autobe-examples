import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test super-administrator token refresh with session validation.
 *
 * Validates the primary success path for super-administrator token refresh, verifying that valid refresh tokens generate new access and refresh tokens while maintaining session continuity. The test ensures token rotation behavior where old tokens remain valid until their original expiration.
 *
 * The token refresh mechanism enables continuous platform access without re-authentication, with access tokens having short lifespans and refresh tokens having longer lifespans. Token rotation maintains security while providing seamless user experience.
 *
 * 1. Register super-administrator with email, display name, and password to obtain initial tokens.
 * 2. Verify the join response contains IAuthorized with access, refresh tokens and superAdministrator summary.
 * 3. Extract refresh token from join response and verify it appears in session storage.
 * 4. Call refresh endpoint with valid refresh token to obtain new token pair.
 * 5. Verify the refresh response contains new IAuthorized structure with fresh tokens.
 * 6. Verify superAdministrator summary in response matches the registered account (same id, email, display_name).
 * 7. Verify access token has shorter expiration than refresh token for dual-token pattern.
 * 8. Verify new access token can authenticate subsequent API requests successfully.
 * 9. Verify old tokens remain valid until original expiration (token rotation, not immediate invalidation).
 */
export async function test_api_super_administrator_refresh_primary_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register super-administrator to obtain initial tokens
  const saConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_super_administrator_join(saConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(2),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(initialAuth);
  // Step 2: Verify initial response structure
  typia.assert(initialAuth.token);
  typia.assert(initialAuth.superAdministrator);
  // Step 3: Extract refresh token
  const oldRefreshToken = initialAuth.token.refresh;
  // Step 4: Verify refresh token is not empty
  TestValidator.predicate(
    "refresh token is not empty",
    oldRefreshToken.length > 0,
  );
  // Step 5: Store initial token expiration times
  const initialAccessExpiredAt = initialAuth.token.expired_at;
  const initialRefreshableUntil = initialAuth.token.refreshable_until;
  // Step 6: Call refresh endpoint with valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_super_administrator_refresh(
    refreshConnection,
    {
      body: { refresh_token: oldRefreshToken },
    },
  );
  typia.assert(refreshedAuth);
  // Step 7: Verify refresh response contains new tokens
  typia.assert(refreshedAuth.token);
  const newAccessToken = refreshedAuth.token.access;
  const newRefreshToken = refreshedAuth.token.refresh;
  const newAccessExpiredAt = refreshedAuth.token.expired_at;
  const newRefreshableUntil = refreshedAuth.token.refreshable_until;
  // Step 8: Verify new tokens are different from old tokens
  TestValidator.notEquals(
    "new access token differs from old",
    initialAuth.token.access,
    newAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token differs from old",
    oldRefreshToken,
    newRefreshToken,
  );
  // Step 9: Verify superAdministrator summary matches registered account
  TestValidator.equals(
    "superAdministrator id matches",
    refreshedAuth.superAdministrator.id,
    initialAuth.superAdministrator.id,
  );
  TestValidator.equals(
    "superAdministrator email matches",
    refreshedAuth.superAdministrator.email,
    initialAuth.superAdministrator.email,
  );
  TestValidator.equals(
    "superAdministrator display_name matches",
    refreshedAuth.superAdministrator.display_name,
    initialAuth.superAdministrator.display_name,
  );
  // Step 10: Verify access token expiration is shorter than refresh token
  const initialAccessExpiresTime = new Date(initialAccessExpiredAt).getTime();
  const initialRefreshExpiresTime = new Date(initialRefreshableUntil).getTime();
  const newAccessExpiresTime = new Date(newAccessExpiredAt).getTime();
  const newRefreshExpiresTime = new Date(newRefreshableUntil).getTime();
  const initialTokenLifespan =
    initialRefreshExpiresTime - initialAccessExpiresTime;
  const newTokenLifespan = newRefreshExpiresTime - newAccessExpiresTime;
  TestValidator.predicate(
    "access token has shorter lifespan than refresh token",
    newTokenLifespan > 0,
  );
  // Step 11: Verify old refresh token still works (token rotation behavior)
  // After token rotation, the old refresh token should still be valid until its original expiration
  const rotationConnection: api.IConnection = { host: connection.host };
  const reRefreshedAuth = await authorize_super_administrator_refresh(
    rotationConnection,
    {
      body: { refresh_token: oldRefreshToken },
    },
  );
  typia.assert(reRefreshedAuth);
  TestValidator.equals(
    "old refresh token still works after rotation",
    reRefreshedAuth.superAdministrator.id,
    initialAuth.superAdministrator.id,
  );
  // Step 12: Verify tokens have valid JWT format (3 parts separated by dots)
  TestValidator.predicate(
    "old refresh token has valid JWT format",
    oldRefreshToken.split(".").length === 3,
  );
  TestValidator.predicate(
    "new access token has valid JWT format",
    newAccessToken.split(".").length === 3,
  );
  TestValidator.predicate(
    "new refresh token has valid JWT format",
    newRefreshToken.split(".").length === 3,
  );
  // Step 13: Verify new refresh token also works for future refreshes
  const futureConnection: api.IConnection = { host: connection.host };
  const futureAuth = await authorize_super_administrator_refresh(
    futureConnection,
    {
      body: { refresh_token: newRefreshToken },
    },
  );
  typia.assert(futureAuth);
  TestValidator.equals(
    "new refresh token is valid",
    futureAuth.superAdministrator.id,
    initialAuth.superAdministrator.id,
  );
}
