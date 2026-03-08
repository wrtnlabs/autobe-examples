import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator account using utility function
  const joinConnection: api.IConnection = { host: connection.host };
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const moderator = await authorize_moderator_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      password: joinPassword,
      bio: RandomGenerator.paragraph({ sentences: 2 }) ?? null,
      avatar_url: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeModerator.IJoin,
  });
  typia.assert(moderator);
  // Step 2: Login to obtain refresh token using utility function
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_moderator_login(loginConnection, {
    body: {
      email: typia.assert<string & tags.MaxLength<255> & tags.Format<"email">>(moderator.email),
      password: joinPassword,
    } satisfies IRedditLikeModerator.ILogin,
  });
  typia.assert(loginResponse);
  const refreshToken = loginResponse.token.refresh;
  // Step 3: Test with invalid refresh token (simulating expired token)
  const invalidToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalidsignature";
  // Step 4: Try to refresh with invalid token - should return 401
  await TestValidator.httpError(
    "should return 401 for invalid token",
    401,
    async () => {
      await api.functional.redditLike.auth.moderator.refresh(connection, {
        body: {
          refreshToken: invalidToken,
        } satisfies IRedditLikeModerator.IRefresh,
      });
    },
  );
  // Step 5: Verify that valid refresh token still works
  const validRefreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_moderator_refresh(validRefreshConnection, {
    body: {
      refreshToken: refreshToken,
    } satisfies IRedditLikeModerator.IRefresh,
  });
  typia.assert(refreshed);
  // Verify new token is issued
  TestValidator.notEquals(
    "new access token issued",
    refreshed.token.access,
    loginResponse.token.access,
  );
}