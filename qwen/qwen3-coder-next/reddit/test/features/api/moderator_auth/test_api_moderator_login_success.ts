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
  // Step 1: Register a new moderator account
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      password: "SecurePass123!",
      bio: "Test moderator account for E2E testing",
      avatar_url: null,
      href: "https://example.com/profile",
      referrer: "https://example.com/referrer",
    } satisfies IRedditLikeModerator.IJoin,
  });
  typia.assert(moderator);
  // Step 2: Login with the registered credentials
  const moderatorLoginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_moderator_login(
    moderatorLoginConnection,
    {
      body: {
        email: typia.assert<string & tags.MaxLength<255> & tags.Format<"email">>(moderator.email),
        password: "SecurePass123!",
      } satisfies IRedditLikeModerator.ILogin,
    },
  );
  typia.assert(loginResult);
  // Step 3: Validate login response structure
  TestValidator.predicate("has valid UUID id", () =>
    /^[0-9a-f-]{36}$/i.test(loginResult.id),
  );
  TestValidator.equals(
    "email matches input",
    loginResult.email,
    moderator.email,
  );
  TestValidator.equals(
    "username matches",
    loginResult.username,
    moderator.username,
  );
  TestValidator.equals(
    "display_name matches",
    loginResult.display_name,
    moderator.display_name,
  );
}