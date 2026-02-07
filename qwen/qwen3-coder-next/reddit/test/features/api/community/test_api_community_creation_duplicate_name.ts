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

export async function test_api_community_creation_duplicate_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuthorization = await api.functional.redditPlatform.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        name: RandomGenerator.name(),
      } satisfies IRedditPlatformUser.IJoin,
    },
  );
  typia.assert(userAuthorization);
  // Create new connection with authentication token
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    Authorization: userAuthorization.token.access,
  };
  // 2. Create first community
  const firstCommunity =
    await api.functional.redditPlatform.user.communities.create(
      authenticatedConnection,
      {
        body: {
          name: "test_community",
          description: "A test community for duplicate name testing",
          icon_url: "https://example.com/icon.png",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(firstCommunity);
  // 3. Attempt to create second community with same name (should fail)
  await TestValidator.error(
    "should fail with duplicate community name",
    async () => {
      await api.functional.redditPlatform.user.communities.create(
        authenticatedConnection,
        {
          body: {
            name: "test_community", // Same name as first community
            description: "Duplicate community attempt",
            icon_url: "https://example.com/icon2.png",
          } satisfies IRedditPlatformCommunity.ICreate,
        },
      );
    },
  );
}
