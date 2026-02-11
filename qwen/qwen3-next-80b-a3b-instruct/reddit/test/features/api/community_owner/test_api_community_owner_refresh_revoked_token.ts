import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";

export async function test_api_community_owner_refresh_revoked_token(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Join to get the initial refresh token
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_community_owner_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityCommunityOwner.IJoin,
  });
  typia.assert(joinResponse);
  const oldRefreshToken = joinResponse.token.refresh;
  // Step 2: Use old refresh token (valid at this point) to refresh — get new token
  const refreshConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Cookie: `refreshToken=${oldRefreshToken}`,
    },
  };
  const refreshResponse =
    await api.functional.redditCommunity.auth.communityOwner.refresh(
      refreshConnection,
      {
        body: {} satisfies IRedditCommunityCommunityOwner.IRefresh,
      },
    );
  typia.assert(refreshResponse);
  const newRefreshToken = refreshResponse.token.refresh;
  // Step 3: Now attempt refresh with the old (revoked) refresh token — it must fail
  const revokedTokenConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Cookie: `refreshToken=${oldRefreshToken}`,
    },
  };
  await TestValidator.httpError(
    "refresh with revoked token should return 401",
    401,
    async () => {
      await api.functional.redditCommunity.auth.communityOwner.refresh(
        revokedTokenConnection,
        {
          body: {} satisfies IRedditCommunityCommunityOwner.IRefresh,
        },
      );
    },
  );
}
