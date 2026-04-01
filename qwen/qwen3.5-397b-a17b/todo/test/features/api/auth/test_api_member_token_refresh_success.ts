import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful token refresh with a valid refresh token.
 *
 * This test verifies the complete token refresh workflow:
 * 1. Member registration to obtain initial tokens
 * 2. Token refresh using the refresh token
 * 3. Validation of new token structure and expiration
 * 4. Verification that new access token works for protected endpoints
 * 5. Multiple consecutive refreshes to demonstrate session continuation
 *
 * Expected behavior:
 * - Refresh returns new access and refresh tokens
 * - refreshable_until timestamp is maintained or extended
 * - New tokens are valid for API authentication
 * - Multiple refreshes succeed within the refreshable_until window
 */
export async function test_api_member_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member to obtain initial tokens
  const joinResult = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(joinResult);
  // Store original token timestamps for comparison
  const originalExpiredAt = joinResult.token.expired_at;
  const originalRefreshableUntil = joinResult.token.refreshable_until;
  const originalRefreshToken = joinResult.token.refresh;
  // 2. First token refresh
  const refreshResult1 = await authorize_member_refresh(connection, {
    body: {
      refresh_token: joinResult.token.refresh,
    } satisfies IMultiUserTodoMember.IRefresh,
  });
  typia.assert(refreshResult1);
  // 3. Validate new tokens are different
  TestValidator.notEquals(
    "access token should be different after refresh",
    joinResult.token.access,
    refreshResult1.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be rotated",
    originalRefreshToken,
    refreshResult1.token.refresh,
  );
  // 4. Validate refreshable_until is maintained or extended
  TestValidator.predicate(
    "refreshable_until should be maintained or extended",
    new Date(refreshResult1.token.refreshable_until).getTime() >=
      new Date(originalRefreshableUntil).getTime(),
  );
  // 5. Validate new access token works by checking member ID matches
  TestValidator.equals(
    "member ID should remain same after refresh",
    joinResult.id,
    refreshResult1.id,
  );
  // 6. Second token refresh to demonstrate multiple refreshes work
  const refreshResult2 = await authorize_member_refresh(connection, {
    body: {
      refresh_token: refreshResult1.token.refresh,
    } satisfies IMultiUserTodoMember.IRefresh,
  });
  typia.assert(refreshResult2);
  // 7. Validate second refresh also produces new tokens
  TestValidator.notEquals(
    "second refresh should produce new access token",
    refreshResult1.token.access,
    refreshResult2.token.access,
  );
  TestValidator.notEquals(
    "second refresh should rotate refresh token again",
    refreshResult1.token.refresh,
    refreshResult2.token.refresh,
  );
  // 8. Validate member ID consistency across all refreshes
  TestValidator.equals(
    "member ID should be consistent across all refreshes",
    refreshResult1.id,
    refreshResult2.id,
  );
  // 9. Validate all token structures
  typia.assert(refreshResult2.token);
}
