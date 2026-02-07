import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_token_refresh(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new moderator account via join with generated credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = "securePassword123";
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_moderator_join(joinConnection, {
    body: { email, password } satisfies ICommunityModerator.IJoin,
  });
  typia.assert(joinResult);
  // 2. Authenticate the moderator to activate the session and obtain refresh token
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_moderator_login(loginConnection, {
    body: { email, password } satisfies ICommunityModerator.ILogin,
  });
  typia.assert(loginResult);
  // 3. Use the refresh token from the login result to refresh the access token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_moderator_refresh(refreshConnection, {
    body: {
      refresh: loginResult.token.refresh,
    } satisfies ICommunityModerator.IRefresh,
  });
  typia.assert(refreshResult);
  // 4. Validate the refresh operation: new tokens are different from old ones
  TestValidator.notEquals(
    "new access token differs from old",
    loginResult.token.access,
    refreshResult.token.access,
  );
  TestValidator.notEquals(
    "new refresh token differs from old",
    loginResult.token.refresh,
    refreshResult.token.refresh,
  );
  TestValidator.predicate(
    "new access token is not expired",
    () => new Date(refreshResult.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "new refresh token is valid until future date",
    () => new Date(refreshResult.token.refreshable_until) > new Date(),
  );
  // 5. Verify the old refresh token is invalidated (should fail)
  await TestValidator.error("old refresh token is invalidated", async () => {
    await authorize_moderator_refresh(refreshConnection, {
      body: {
        refresh: loginResult.token.refresh,
      } satisfies ICommunityModerator.IRefresh,
    });
  });
}
