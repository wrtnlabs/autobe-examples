import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_profile_access_denied_to_other_users(
  connection: api.IConnection,
): Promise<void> {
  // Create first moderator (caller)
  const callerConnection: api.IConnection = { host: connection.host };
  const moderator1 = await authorize_moderator_join(callerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      display_name: RandomGenerator.name(),
    } satisfies IRedditLikeModerator.IJoin,
  });
  // Create second moderator (target)
  const targetConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      display_name: RandomGenerator.name(),
    } satisfies IRedditLikeModerator.IJoin,
  });
  // Create a fresh connection with the first moderator's token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: moderator1.token.access,
    },
  };
  // Attempt to access own profile (should succeed)
  const ownProfile = await api.functional.redditLike.moderator.profile.at(
    authenticatedConnection,
  );
  typia.assert(ownProfile);
  // Create another connection for second moderator
  const secondModeratorConnection: api.IConnection = { host: connection.host };
  const moderator2 = await authorize_moderator_join(secondModeratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      display_name: RandomGenerator.name(),
    } satisfies IRedditLikeModerator.IJoin,
  });
  // Create connection with second moderator's token and try to access first moderator's profile
  const attackerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: moderator2.token.access,
    },
  };
  // First moderator attempts to access second moderator's profile (should fail with 403)
  await TestValidator.httpError(
    "should reject unauthorized profile access",
    403,
    async () => {
      await api.functional.redditLike.moderator.profile.at(attackerConnection);
    },
  );
}
