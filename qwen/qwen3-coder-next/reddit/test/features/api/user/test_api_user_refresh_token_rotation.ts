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

export async function test_api_user_refresh_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create user and obtain initial tokens via join
  const userConnection: api.IConnection = { host: connection.host };
  const firstJoinResponse = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  typia.assert(firstJoinResponse);
  // Store the initial refresh token for later validation
  const initialRefreshToken = firstJoinResponse.token.refresh;
  // Step 2: First refresh call should return new access and refresh tokens
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_user_refresh(refreshConnection, {
    body: {
      refresh: initialRefreshToken,
    } satisfies IRedditPlatformUser.IRefresh,
  });
  typia.assert(refreshResponse);
  // Verify that the new refresh token is different from the old one (rotation works)
  TestValidator.notEquals(
    "refresh tokens differ after refresh",
    initialRefreshToken,
    refreshResponse.token.refresh,
  );
  TestValidator.equals(
    "access token updated",
    typeof refreshResponse.token.access,
    "string",
  );
  // Step 3: Attempt to use the old refresh token for a second refresh
  // Step 4: Verify old token is rejected (rotation works)
  await TestValidator.error("old refresh token rejected", async () => {
    const oldRefreshConnection: api.IConnection = { host: connection.host };
    await authorize_user_refresh(oldRefreshConnection, {
      body: {
        refresh: initialRefreshToken,
      } satisfies IRedditPlatformUser.IRefresh,
    });
  });
  // Step 5: Confirm only new refresh token can be used for subsequent refresh operations
  const finalConnection: api.IConnection = { host: connection.host };
  const finalRefreshResponse = await authorize_user_refresh(finalConnection, {
    body: {
      refresh: refreshResponse.token.refresh,
    } satisfies IRedditPlatformUser.IRefresh,
  });
  typia.assert(finalRefreshResponse);
  // Verify the chain continues (new token again)
  TestValidator.notEquals(
    "refresh tokens differ again",
    refreshResponse.token.refresh,
    finalRefreshResponse.token.refresh,
  );
}
