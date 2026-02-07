import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_moderated_communities_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for the test user
  const userConnection: api.IConnection = { host: connection.host };
  // Register and authenticate user with empty IJoin DTO
  const authResponse = await authorize_user_join(userConnection, {
    body: {} satisfies IRedditPlatformUser.IJoin,
  });
  typia.assert(authResponse);
  // Create new connection with the token from authentication
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authResponse.token.access}`,
    },
  };
  // Call moderated communities endpoint
  const moderatedCommunities =
    await api.functional.redditPlatform.user.user.moderated_communities.at(
      authenticatedConnection,
    );
  typia.assert(moderatedCommunities);
  // Validate response structure - ISummary is currently empty but should be object
  void TestValidator.predicate(
    "response is valid object",
    () => moderatedCommunities !== null && typeof moderatedCommunities === "object",
  );
}