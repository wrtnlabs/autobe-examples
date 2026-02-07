import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user via join endpoint
  const userConnection: api.IConnection = { host: connection.host };
  const joinResponse = await api.functional.redditPlatform.auth.user.join(
    userConnection,
    {
      body: typia.random<IRedditPlatformUser.IJoin>(),
    },
  );
  typia.assert(joinResponse);
  // 2. Store the refresh token from the join response
  const initialRefreshToken = joinResponse.token.refresh;
  typia.assert(initialRefreshToken);
  // 3. Call refresh endpoint with valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await api.functional.redditPlatform.auth.user.refresh(
    refreshConnection,
    {
      body: {
        refresh: initialRefreshToken,
      } satisfies IRedditPlatformUser.IRefresh,
    },
  );
  typia.assert(refreshResponse);
  // 4. Verify new access and refresh tokens are generated
  TestValidator.notEquals(
    "new access token is different from initial",
    refreshResponse.token.access,
    joinResponse.token.access,
  );
  TestValidator.notEquals(
    "new refresh token is different from initial",
    refreshResponse.token.refresh,
    initialRefreshToken,
  );
  // 5. Verify token rotation (old refresh token is invalidated)
  const invalidRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("old refresh token is invalidated", async () => {
    await api.functional.redditPlatform.auth.user.refresh(
      invalidRefreshConnection,
      {
        body: {
          refresh: initialRefreshToken,
        } satisfies IRedditPlatformUser.IRefresh,
      },
    );
  });
  // 6. Confirm session continuity with new tokens
  const newRefreshToken = refreshResponse.token.refresh;
  const continuationConnection: api.IConnection = { host: connection.host };
  const continuationResponse =
    await api.functional.redditPlatform.auth.user.refresh(
      continuationConnection,
      {
        body: {
          refresh: newRefreshToken,
        } satisfies IRedditPlatformUser.IRefresh,
      },
    );
  typia.assert(continuationResponse);
  TestValidator.equals(
    "continuation uses new tokens",
    continuationResponse.token.refresh,
    newRefreshToken,
  );
}
