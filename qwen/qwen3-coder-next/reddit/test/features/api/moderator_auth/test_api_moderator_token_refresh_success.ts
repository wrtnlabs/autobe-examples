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

export async function test_api_moderator_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Join a new moderator account and save the password
  const joinConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const moderator = await authorize_moderator_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: password,
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
    } satisfies IRedditLikeModerator.IJoin,
  });
  typia.assert(moderator);
  // Step 2: Login using the saved password
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedin = await authorize_moderator_login(loginConnection, {
    body: {
      email: moderator.email,
      password: password,
    } satisfies IRedditLikeModerator.ILogin,
  });
  typia.assert(loggedin);
  // Step 3: Use stored refresh token to call refresh endpoint
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_moderator_refresh(refreshConnection, {
    body: {
      refreshToken: loggedin.token.refresh,
    } satisfies IRedditLikeModerator.IRefresh,
  });
  typia.assert(refreshed);
  // Step 4: Validate new tokens
  TestValidator.notEquals(
    "access token differs",
    refreshed.token.access,
    loggedin.token.access,
  );
  TestValidator.notEquals(
    "refresh token differs",
    refreshed.token.refresh,
    loggedin.token.refresh,
  );
  // Step 5: Validate token structure
  TestValidator.predicate(
    "new access token format",
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(
      refreshed.token.access,
    ),
  );
  TestValidator.predicate(
    "new refresh token format",
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(
      refreshed.token.refresh,
    ),
  );
  // Step 6: Validate expiration timestamps are extended
  const originalExpired = new Date(loggedin.token.expired_at).getTime();
  const newExpired = new Date(refreshed.token.expired_at).getTime();
  TestValidator.predicate("expired_at extended", newExpired > originalExpired);
  const originalRefreshable = new Date(
    loggedin.token.refreshable_until,
  ).getTime();
  const newRefreshable = new Date(refreshed.token.refreshable_until).getTime();
  TestValidator.predicate(
    "refreshable_until extended",
    newRefreshable > originalRefreshable,
  );
}
