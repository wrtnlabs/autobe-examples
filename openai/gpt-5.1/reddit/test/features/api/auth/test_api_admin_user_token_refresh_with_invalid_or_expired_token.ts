import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserRefresh";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";

/**
 * Validate that adminUser refresh rejects invalid, tampered, or re-used tokens.
 *
 * Business context:
 *
 * - AdminUser accounts authenticate via JWT access/refresh tokens.
 * - /auth/adminUser/join issues an initial IAuthorizationToken bundle.
 * - /auth/adminUser/refresh should only accept legitimate, non-expired refresh
 *   tokens.
 * - When refresh fails (invalid, malformed, or expired/invalidated token), no
 *   ICommunityPlatformAdminuser.IAuthorized payload should be returned and the
 *   client must observe an authentication error instead.
 *
 * Test flow:
 *
 * 1. Create a fresh adminUser via join to obtain a valid refresh token.
 * 2. Positive control: call refresh once with the valid refresh token and verify
 *    it succeeds and returns a new authorized context.
 * 3. Scenario A (random token): call refresh with a completely random string as
 *    refreshToken and verify that an error is thrown (invalid token).
 * 4. Scenario B (tampered token): call refresh with the original valid refresh
 *    token but with extra random characters appended so that it becomes
 *    cryptographically invalid, and verify that an error is thrown.
 * 5. Scenario C (re-used token as proxy for expired/invalidated token): after the
 *    successful positive-control refresh, attempt to call refresh again using
 *    the _original_ refresh token obtained from join (assuming the backend may
 *    treat it as invalidated / expired once used) and verify that an error is
 *    thrown.
 *
 * Notes and constraints:
 *
 * - We never manipulate connection.headers directly; token header management is
 *   handled solely by the SDK implementations of join/refresh.
 * - We never send wrong-typed data; all refreshToken values are strings as
 *   required by ICommunityPlatformAdminUserRefresh.IRequest.
 * - We do not assert on concrete HTTP status codes, only that the refresh
 *   operation fails for invalid tokens.
 */
export async function test_api_admin_user_token_refresh_with_invalid_or_expired_token(
  connection: api.IConnection,
) {
  // 1. Join adminUser to obtain a baseline valid token set
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const joined: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, { body: joinBody });
  typia.assert(joined);

  const originalToken: IAuthorizationToken = joined.token;
  typia.assert<IAuthorizationToken>(originalToken);

  // 2. Positive control: refresh with valid refresh token should succeed
  const positiveRefreshBody = {
    refreshToken: originalToken.refresh,
  } satisfies ICommunityPlatformAdminUserRefresh.IRequest;

  const refreshed: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.refresh(connection, {
      body: positiveRefreshBody,
    });
  typia.assert(refreshed);

  // 3. Scenario A - completely random refresh token
  const randomInvalidRefreshBody = {
    refreshToken: RandomGenerator.alphaNumeric(64),
  } satisfies ICommunityPlatformAdminUserRefresh.IRequest;

  await TestValidator.error(
    "refresh with a completely random token should fail",
    async () => {
      await api.functional.auth.adminUser.refresh(connection, {
        body: randomInvalidRefreshBody,
      });
    },
  );

  // 4. Scenario B - tampered refresh token (append random characters)
  const tamperedRefreshBody = {
    refreshToken: `${originalToken.refresh}.${RandomGenerator.alphaNumeric(8)}`,
  } satisfies ICommunityPlatformAdminUserRefresh.IRequest;

  await TestValidator.error(
    "refresh with a tampered token should fail",
    async () => {
      await api.functional.auth.adminUser.refresh(connection, {
        body: tamperedRefreshBody,
      });
    },
  );

  // 5. Scenario C - re-use the original refresh token after it has been used
  const reusedRefreshBody = {
    refreshToken: originalToken.refresh,
  } satisfies ICommunityPlatformAdminUserRefresh.IRequest;

  await TestValidator.error(
    "re-using an already-used refresh token should fail (proxy for expired/invalidated)",
    async () => {
      await api.functional.auth.adminUser.refresh(connection, {
        body: reusedRefreshBody,
      });
    },
  );
}
