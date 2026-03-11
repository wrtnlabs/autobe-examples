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

export async function test_api_member_refresh_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(1),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatarUrl: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditPlatformMember.IJoin;
  const joinOutput = await api.functional.redditPlatform.auth.member.join(
    joinConnection,
    { body: joinInput },
  );
  typia.assert(joinOutput);
  // Store initial refresh token
  const initialRefreshToken = joinOutput.refresh;
  typia.assert(joinOutput.user);
  const initialUserId = joinOutput.user.id;
  const initialUsername = joinOutput.user.username;
  // 2. Refresh using the initial refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshInput = {
    refresh_token: initialRefreshToken,
  } satisfies IRedditPlatformMember.IRefresh;
  const refreshOutput = await api.functional.redditPlatform.auth.member.refresh(
    refreshConnection,
    { body: refreshInput },
  );
  typia.assert(refreshOutput);
  // 3. Validate user profile is returned correctly
  TestValidator.equals("user id matches", refreshOutput.user.id, initialUserId);
  TestValidator.equals(
    "username matches",
    refreshOutput.user.username,
    initialUsername,
  );
  TestValidator.equals(
    "display name matches",
    refreshOutput.user.display_name,
    joinInput.displayName,
  );
  TestValidator.equals("karma score exists", refreshOutput.user.karma_score, 0);
  TestValidator.equals("is active true", refreshOutput.user.is_active, true);
  // 4. Validate new access token is issued
  TestValidator.predicate(
    "access token is string",
    refreshOutput.access.length > 0,
  );
  TestValidator.predicate(
    "access token expired at valid",
    refreshOutput.expired_at.length > 0,
  );
  // 5. Validate new refresh token is issued (token rotation)
  TestValidator.predicate(
    "refresh token is string",
    refreshOutput.refresh.length > 0,
  );
  TestValidator.notEquals(
    "refresh tokens differ",
    initialRefreshToken,
    refreshOutput.refresh,
  );
  // 6. Verify old refresh token cannot be used (token rotation)
  await TestValidator.error("old refresh token is invalid", async () => {
    const staleRefreshConnection: api.IConnection = { host: connection.host };
    await api.functional.redditPlatform.auth.member.refresh(
      staleRefreshConnection,
      {
        body: {
          refresh_token: initialRefreshToken,
        } satisfies IRedditPlatformMember.IRefresh,
      },
    );
  });
  // 7. Verify new access token is valid by checking token structure
  TestValidator.predicate(
    "token has access and refresh",
    refreshOutput.token.access.length > 0,
  );
  TestValidator.predicate(
    "token has refresh",
    refreshOutput.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token has expiration",
    refreshOutput.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token has refreshable until",
    refreshOutput.token.refreshable_until.length > 0,
  );
  // 8. Verify sessions are included in output
  TestValidator.predicate(
    "sessions array exists",
    refreshOutput.sessions.length >= 1,
  );
}
