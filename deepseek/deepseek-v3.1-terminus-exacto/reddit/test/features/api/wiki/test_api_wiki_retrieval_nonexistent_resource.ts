import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityWiki } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityWiki";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_wiki_retrieval_nonexistent_resource(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection for registration
  const registrationConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(registrationConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Create authenticated user connection for community creation
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: `Bearer ${user.token.access}` };
  // Create a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Attempt to retrieve a non-existent wiki page
  await TestValidator.httpError(
    "wiki retrieval with non-existent ID",
    404,
    async () => {
      await api.functional.communityPlatform.communities.wikis.at(
        userConnection,
        {
          communityId: community.id,
          wikiId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Attempt to retrieve a wiki page from a non-existent community
  await TestValidator.httpError(
    "wiki retrieval with non-existent community",
    404,
    async () => {
      await api.functional.communityPlatform.communities.wikis.at(
        userConnection,
        {
          communityId: typia.random<string & tags.Format<"uuid">>(),
          wikiId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
