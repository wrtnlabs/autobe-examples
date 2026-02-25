import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
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
  // Step 1: Create a new moderator account to obtain refresh token
  const moderatorConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  typia.assert(registered);
  // Step 2: Use the refresh token to get new authentication tokens
  const refreshed = await authorize_moderator_refresh(connection, {
    body: {
      refreshToken: registered.refresh_token,
    } satisfies IRedditCloneModerator.IRefresh,
  });
  typia.assert(refreshed);
  // Step 3: Validate that refresh was successful
  TestValidator.equals(
    "refreshed token exists",
    typeof refreshed.access_token,
    "string",
  );
  TestValidator.equals(
    "refreshed refresh token exists",
    typeof refreshed.refresh_token,
    "string",
  );
  TestValidator.predicate(
    "access token is different from original",
    registered.access_token !== refreshed.access_token,
  );
  TestValidator.predicate(
    "refresh token is different from original",
    registered.refresh_token !== refreshed.refresh_token,
  );
}
