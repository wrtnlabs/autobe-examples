import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityWiki } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityWiki";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_moderator_communities_wikis_create } from "../../../generate/generate_random_community_platform_moderator_communities_wikis_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_wiki } from "../../../prepare/prepare_random_community_platform_community_wiki";

export async function test_api_community_wiki_unauthorized_attempt(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create moderator user (wiki author)
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Create community as regular user (not moderator)
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create wiki page as moderator (author)
  const wiki =
    await generate_random_community_platform_moderator_communities_wikis_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          slug: RandomGenerator.alphabets(8),
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunityWiki.ICreate,
      },
    );
  typia.assert(wiki);
  // Setup: Create second user (non-moderator, non-author)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(unauthorizedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password456",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Attempt to update wiki with unauthorized user
  await TestValidator.httpError("unauthorized wiki update", 403, async () => {
    await api.functional.communityPlatform.moderator.communities.wikis.update(
      unauthorizedConnection,
      {
        communityId: community.id,
        wikiId: wiki.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityPlatformCommunityWiki.IUpdate,
      },
    );
  });
}
