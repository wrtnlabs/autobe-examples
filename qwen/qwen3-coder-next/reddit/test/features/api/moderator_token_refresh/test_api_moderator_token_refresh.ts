import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
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
  // 1. Create moderator account with specific credentials
  const moderatorConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: "moderator@test.com",
    password: "123456",
    name: RandomGenerator.name(),
  } satisfies IRedditPlatformModerator.IJoin;
  const joinResult = await api.functional.redditPlatform.auth.moderator.join(
    moderatorConnection,
    {
      body: credentials,
    },
  );
  typia.assert(joinResult);
  // 2. Login with the same credentials to get initial tokens
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await api.functional.redditPlatform.auth.moderator.login(
    loginConnection,
    {
      body: {
        email: credentials.email,
        password: credentials.password,
      } satisfies IRedditPlatformModerator.ILogin,
    },
  );
  typia.assert(loginResult);
  // 3. Test token refresh with the refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult =
    await api.functional.redditPlatform.auth.moderator.refresh(
      refreshConnection,
      {
        body: {
          refresh: loginResult.token.refresh,
        } satisfies IRedditPlatformModerator.IRefresh,
      },
    );
  typia.assert(refreshResult);
  // 4. Validate new tokens are generated
  TestValidator.notEquals(
    "access tokens differ",
    joinResult.token.access,
    refreshResult.token.access,
  );
  TestValidator.notEquals(
    "refresh tokens differ",
    loginResult.token.refresh,
    refreshResult.token.refresh,
  );
  // 5. Validate token expiration times
  const now = new Date().toISOString();
  TestValidator.predicate(
    "new access token not expired",
    refreshResult.token.expired_at > now,
  );
  TestValidator.predicate(
    "new refresh token still valid",
    refreshResult.token.refreshable_until > now,
  );
}
