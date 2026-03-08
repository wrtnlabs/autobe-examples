import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new member account via join endpoint
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await api.functional.redditPlatform.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(joinResult);
  // 2. Capture refresh token from join response
  const initialRefreshToken = joinResult.token.refresh;
  // 3. Submit refresh token to refresh endpoint using fresh connection
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await api.functional.redditPlatform.auth.member.refresh(
    refreshConnection,
    {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies IRedditPlatformMember.IRefresh,
    },
  );
  typia.assert(refreshResult);
  // 4. Verify member profile information preserved
  TestValidator.equals("member id preserved", refreshResult.id, joinResult.id);
  TestValidator.equals(
    "username preserved",
    refreshResult.username,
    joinResult.username,
  );
  TestValidator.equals(
    "display name preserved",
    refreshResult.displayName,
    joinResult.displayName,
  );
  TestValidator.equals(
    "email preserved",
    refreshResult.email,
    joinResult.email,
  );
  TestValidator.equals(
    "karma score preserved",
    refreshResult.karmaScore,
    joinResult.karmaScore,
  );
  TestValidator.equals(
    "is active preserved",
    refreshResult.isActive,
    joinResult.isActive,
  );
  // 5. Verify new token pair generated
  const newAccessToken = refreshResult.token.access;
  const newRefreshToken = refreshResult.token.refresh;
  // Access token should be different from old
  TestValidator.notEquals(
    "new access token generated",
    initialRefreshToken,
    newAccessToken,
  );
  // Refresh token should be different from old (token rotation)
  TestValidator.notEquals(
    "refresh token rotated",
    initialRefreshToken,
    newRefreshToken,
  );
  // 6. Verify token expiration timestamps
  TestValidator.predicate("access token expiration in future", () => {
    const now = new Date();
    const expiredAt = new Date(refreshResult.token.expired_at);
    return expiredAt > now;
  });
  TestValidator.predicate("refreshable until in future", () => {
    const now = new Date();
    const refreshableUntil = new Date(refreshResult.token.refreshable_until);
    return refreshableUntil > now;
  });
  // RefreshableUntil should be later than expiredAt
  TestValidator.predicate("refreshable until after access expired", () => {
    const expiredAt = new Date(refreshResult.token.expired_at);
    const refreshableUntil = new Date(refreshResult.token.refreshable_until);
    return refreshableUntil > expiredAt;
  });
  // 7. Verify old refresh token is now invalid
  await TestValidator.error(
    "old refresh token invalid after rotation",
    async () => {
      const staleConnection: api.IConnection = { host: connection.host };
      await api.functional.redditPlatform.auth.member.refresh(staleConnection, {
        body: {
          refresh_token: initialRefreshToken,
        } satisfies IRedditPlatformMember.IRefresh,
      });
    },
  );
}
