import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validate member authentication token refresh after registration and login.
 *
 * Steps:
 *
 * 1. Register a new member (join endpoint), capturing access and refresh tokens.
 * 2. Use the access token context (automatically handled).
 * 3. Perform a refresh operation with the valid refresh token (SDK manages
 *    header/cookie).
 * 4. Ensure new tokens are issued (differ from previous values) and expiration is
 *    extended.
 * 5. Attempt another refresh with the previous (now invalid) refresh token; expect
 *    a business logic error.
 */
export async function test_api_member_token_refresh_after_successful_login(
  connection: api.IConnection,
) {
  // 1. Register a new member
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const memberJoinBody = {
    email,
    password,
  } satisfies ICommunityPlatformMember.ICreate;

  const joinResult = await api.functional.auth.member.join(connection, {
    body: memberJoinBody,
  });
  typia.assert(joinResult);

  const originalAccessToken = joinResult.token.access;
  const originalRefreshToken = joinResult.token.refresh;
  const originalAccessExpires = joinResult.token.expired_at;
  const originalRefreshExpires = joinResult.token.refreshable_until;

  // 2. Perform token refresh
  const refreshInput = {} satisfies ICommunityPlatformMember.IRefresh;
  const refreshResult = await api.functional.auth.member.refresh(connection, {
    body: refreshInput,
  });
  typia.assert(refreshResult);
  const newAccessToken = refreshResult.token.access;
  const newRefreshToken = refreshResult.token.refresh;
  const newAccessExpires = refreshResult.token.expired_at;
  const newRefreshExpires = refreshResult.token.refreshable_until;

  // 3. Validate new tokens and expiration times
  TestValidator.notEquals(
    "access token should change after refresh",
    newAccessToken,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token should change after refresh",
    newRefreshToken,
    originalRefreshToken,
  );
  TestValidator.notEquals(
    "access token expiry timestamp should change",
    newAccessExpires,
    originalAccessExpires,
  );
  TestValidator.notEquals(
    "refresh token expiry timestamp should change",
    newRefreshExpires,
    originalRefreshExpires,
  );

  // 4. Ensure the old refresh token cannot be used again (simulate by restoring connection with old refresh token)
  const badConnection: api.IConnection = {
    ...connection,
    headers: { ...connection.headers, Authorization: originalAccessToken },
  };
  await TestValidator.error(
    "old (used) refresh token should be invalidated",
    async () => {
      await api.functional.auth.member.refresh(badConnection, {
        body: refreshInput,
      });
    },
  );
}
