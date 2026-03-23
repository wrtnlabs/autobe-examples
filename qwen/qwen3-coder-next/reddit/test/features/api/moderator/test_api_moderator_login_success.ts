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

export async function test_api_moderator_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account first
  const moderatorConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(),
  } satisfies IRedditLikeModerator.IJoin;
  const moderator: IRedditLikeModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: joinInput,
    });
  typia.assert(moderator);
  // 2. Login with the created moderator account
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult: IRedditLikeModerator.IAuthorized =
    await authorize_moderator_login(loginConnection, {
      body: {
        email: moderator.email,
        password: joinInput.password,
      } satisfies IRedditLikeModerator.ILogin,
    });
  typia.assert(loginResult);
  // 3. Validate response structure
  TestValidator.equals("has moderator id", loginResult.id !== undefined, true);
  TestValidator.equals("has email", loginResult.email !== undefined, true);
  TestValidator.equals(
    "has display_name",
    loginResult.display_name !== undefined,
    true,
  );
  TestValidator.predicate("has karma_score >= 0", loginResult.karma_score >= 0);
  TestValidator.equals(
    "has token object",
    loginResult.token !== undefined,
    true,
  );
  TestValidator.equals(
    "has access token",
    loginResult.token.access !== undefined,
    true,
  );
  TestValidator.equals(
    "has refresh token",
    loginResult.token.refresh !== undefined,
    true,
  );
  TestValidator.predicate(
    "has valid expired_at",
    loginResult.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "has valid refreshable_until",
    loginResult.token.refreshable_until !== undefined,
  );
}
