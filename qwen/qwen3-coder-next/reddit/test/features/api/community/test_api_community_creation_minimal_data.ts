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
import { generate_random_reddit_platform_user_communities_create } from "../../../generate/generate_random_reddit_platform_user_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_community_creation_minimal_data(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection with authentication
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: `user_${RandomGenerator.alphaNumeric(8)}`,
    } satisfies IRedditPlatformUser.IJoin,
  });
  // Create new connection with authenticated token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: userAuth.token.access,
    },
  };
  // Test minimal community creation with only required name
  const community = await api.functional.redditPlatform.user.communities.create(
    authenticatedConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: null,
        icon_url: null,
      } satisfies IRedditPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  // Validate community structure
  TestValidator.predicate("community has id", (community as IEntity & { id: string }).id !== undefined);
  TestValidator.predicate(
    "community has name",
    typeof (community as { name: string }).name === "string" && (community as { name: string }).name.length > 0,
  );
  TestValidator.predicate(
    "community has subscriber_count",
    typeof (community as { subscriber_count: number }).subscriber_count === "number",
  );
  TestValidator.predicate(
    "community has created_at",
    (community as { created_at?: Date | string }).created_at !== undefined,
  );
  TestValidator.predicate(
    "community has updated_at",
    (community as { updated_at?: Date | string }).updated_at !== undefined,
  );
}
