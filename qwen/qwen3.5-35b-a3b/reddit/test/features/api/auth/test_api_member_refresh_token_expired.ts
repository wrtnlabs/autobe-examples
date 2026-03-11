import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_token_expired(
  connection: api.IConnection,
): Promise<void> {
  // Store credentials for later re-authentication
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphaNumeric(12);
  const testUsername = RandomGenerator.alphaNumeric(10);
  // 1. Member joins and obtains initial tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: testEmail,
      username: testUsername,
      password: testPassword,
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(joinResult);
  // Extract initial refresh token
  const initialRefreshToken = joinResult.token.refresh;
  // 2. Attempt refresh with an invalid (expired-simulated) token
  // Using an invalid token string to simulate expired token scenario
  // The server will reject any token that doesn't match active session
  const invalidRefreshToken = "invalid_expired_token_string";
  const refreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "refresh with invalid/expired token returns 401",
    [401],
    async () => {
      await api.functional.redditPlatform.auth.member.refresh(
        refreshConnection,
        {
          body: {
            refresh_token: invalidRefreshToken,
          } satisfies IRedditPlatformMember.IRefresh,
        },
      );
    },
  );
  // 3. Verify re-authentication via login succeeds with valid credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email: testEmail,
      password: testPassword,
    } satisfies IRedditPlatformMember.ILogin,
  });
  typia.assert(loginResult);
  // 4. Verify new tokens are issued with proper structure
  const accessTokenExpiration = new Date(loginResult.token.expired_at);
  const refreshableUntil = new Date(loginResult.token.refreshable_until);
  const now = new Date();
  // Access token should expire within ~2 hours
  TestValidator.predicate(
    "access token expires within reasonable timeframe (2 hours)",
    () => {
      const hoursUntilExpiration =
        (accessTokenExpiration.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursUntilExpiration > 0 && hoursUntilExpiration <= 3; // Allow 1 hour buffer for test execution
    },
  );
  // Refresh token should be valid for ~7 days
  TestValidator.predicate("refresh token has 7-day expiration window", () => {
    const daysUntilRefreshableUntil =
      (refreshableUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntilRefreshableUntil > 6 && daysUntilRefreshableUntil <= 9; // Allow 2 days buffer for test execution
  });
  // 5. Verify refresh token changed after re-login (rotation)
  TestValidator.notEquals(
    "new refresh token issued after login (token rotation)",
    initialRefreshToken,
    loginResult.token.refresh,
  );
  // 6. Verify user identity persisted correctly
  TestValidator.equals(
    "user id matches initial registration",
    joinResult.id,
    loginResult.id,
  );
  TestValidator.equals(
    "username matches initial registration",
    joinResult.username,
    loginResult.username,
  );
  TestValidator.equals(
    "display name matches initial registration",
    joinResult.user.display_name,
    loginResult.user.display_name,
  );
  // 7. Verify session information
  TestValidator.equals(
    "session count updated after re-login",
    1,
    loginResult.sessions.length,
  );
  // 8. Verify user profile data
  TestValidator.equals(
    "karma score initialized to 0",
    0,
    loginResult.user.karma_score,
  );
  TestValidator.equals("account is active", true, loginResult.user.is_active);
  TestValidator.equals(
    "created_at timestamp present",
    true,
    loginResult.user.created_at !== undefined,
  );
}
