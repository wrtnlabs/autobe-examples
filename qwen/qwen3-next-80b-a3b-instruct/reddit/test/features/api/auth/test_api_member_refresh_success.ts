import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member to obtain refresh token
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Extract refresh token from join response
  const refreshToken = joinResponse.token.refresh;
  typia.assertGuard(refreshToken);
  // 3. Use refresh token to obtain new access token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_member_refresh(refreshConnection, {
    body: { refreshToken } satisfies IRedditCommunityMember.IRefresh,
  });
  typia.assert(refreshResponse);
  // 4. Validate that new tokens are issued
  TestValidator.notEquals(
    "new access token differs from old",
    joinResponse.token.access,
    refreshResponse.token.access,
  );
  TestValidator.notEquals(
    "new refresh token differs from old",
    refreshToken,
    refreshResponse.token.refresh,
  );
  // 5. Validate token expiration structure
  TestValidator.predicate(
    "new access token has expiration",
    refreshResponse.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "new refresh token has refreshable_until",
    refreshResponse.token.refreshable_until !== undefined,
  );
  // 6. Verify old refresh token is invalidated
  await TestValidator.error(
    "old refresh token is rejected after refresh",
    async () => {
      const invalidRefreshConnection: api.IConnection = {
        host: connection.host,
      };
      await api.functional.redditCommunity.auth.member.refresh(
        invalidRefreshConnection,
        {
          body: { refreshToken } satisfies IRedditCommunityMember.IRefresh,
        },
      );
    },
  );
  // 7. Verify new refresh token can be used again
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const secondRefreshResponse = await authorize_member_refresh(
    secondRefreshConnection,
    {
      body: {
        refreshToken: refreshResponse.token.refresh,
      } satisfies IRedditCommunityMember.IRefresh,
    },
  );
  typia.assert(secondRefreshResponse);
  // 8. Validate second refresh produced a new token pair
  TestValidator.notEquals(
    "second refresh produced new access token",
    refreshResponse.token.access,
    secondRefreshResponse.token.access,
  );
  TestValidator.notEquals(
    "second refresh produced new refresh token",
    refreshResponse.token.refresh,
    secondRefreshResponse.token.refresh,
  );
}
