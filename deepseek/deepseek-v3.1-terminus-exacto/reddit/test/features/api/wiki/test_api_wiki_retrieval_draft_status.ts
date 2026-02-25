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

export async function test_api_wiki_retrieval_draft_status(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAuthorized);
  // Create community using user connection
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create moderator connection and register moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.alphabets(8),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ICommunityPlatformModerator.IJoin,
    },
  );
  typia.assert(moderatorAuthorized);
  // Create wiki page with draft status
  const wikiCreateData = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
    content: RandomGenerator.paragraph({ sentences: 5 }),
    status: "draft",
  } satisfies ICommunityPlatformCommunityWiki.ICreate;
  const wikiPage =
    await generate_random_community_platform_moderator_communities_wikis_create(
      moderatorConnection,
      {
        body: wikiCreateData,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(wikiPage);
  // Retrieve the wiki page using the public endpoint
  const retrievedWiki =
    await api.functional.communityPlatform.communities.wikis.at(connection, {
      communityId: community.id,
      wikiId: wikiPage.id,
    });
  typia.assert(retrievedWiki);
  // Validate the retrieved wiki page matches the created one
  TestValidator.equals("wiki ID matches", retrievedWiki.id, wikiPage.id);
  TestValidator.equals(
    "wiki title matches",
    retrievedWiki.title,
    wikiPage.title,
  );
  TestValidator.equals("wiki slug matches", retrievedWiki.slug, wikiPage.slug);
  TestValidator.equals(
    "wiki content matches",
    retrievedWiki.content,
    wikiPage.content,
  );
  TestValidator.equals("wiki status is draft", retrievedWiki.status, "draft");
  TestValidator.equals(
    "community ID matches",
    retrievedWiki.community.id,
    community.id,
  );
  TestValidator.equals(
    "author ID matches",
    retrievedWiki.author.id,
    wikiPage.author.id,
  );
  TestValidator.predicate(
    "community summary has valid structure",
    retrievedWiki.community.name === community.name &&
      retrievedWiki.community.description === community.description,
  );
}
