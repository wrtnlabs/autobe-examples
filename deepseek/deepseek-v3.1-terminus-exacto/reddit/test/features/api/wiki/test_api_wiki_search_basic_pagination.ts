import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityWiki } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityWiki";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityWiki } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityWiki";
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

export async function test_api_wiki_search_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create moderator connection for wiki page creation
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Create 12 wiki pages with varied statuses
  const wikiPages: ICommunityPlatformCommunityWiki[] = [];
  const statuses = ["draft", "published", "archived"] as const;
  for (let i = 0; i < 12; i++) {
    const wiki =
      await generate_random_community_platform_moderator_communities_wikis_create(
        moderatorConnection,
        {
          params: { communityId: community.id },
          body: {
            title: `Wiki Page ${i + 1}`,
            slug: `wiki-page-${i + 1}`,
            content: RandomGenerator.content({ paragraphs: 2 }),
            status: RandomGenerator.pick(statuses),
          } satisfies ICommunityPlatformCommunityWiki.ICreate,
        },
      );
    typia.assert(wiki);
    wikiPages.push(wiki);
  }
  // Test pagination with limit=3 and page=1 using user connection
  const firstPage =
    await api.functional.communityPlatform.communities.wikis.index(
      userConnection,
      {
        communityId: community.id,
        body: {
          limit: 3,
          page: 1,
        } satisfies ICommunityPlatformCommunityWiki.IRequest,
      },
    );
  typia.assert(firstPage);
  // Validate first page pagination metadata
  TestValidator.equals(
    "first page current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("first page limit", firstPage.pagination.limit, 3);
  TestValidator.equals("first page data count", firstPage.data.length, 3);
  TestValidator.predicate(
    "first page has records",
    firstPage.pagination.records >= 12,
  );
  TestValidator.predicate(
    "first page has pages",
    firstPage.pagination.pages >= 4,
  );
  // Test pagination with limit=3 and page=2 using user connection
  const secondPage =
    await api.functional.communityPlatform.communities.wikis.index(
      userConnection,
      {
        communityId: community.id,
        body: {
          limit: 3,
          page: 2,
        } satisfies ICommunityPlatformCommunityWiki.IRequest,
      },
    );
  typia.assert(secondPage);
  // Validate second page pagination metadata
  TestValidator.equals(
    "second page current page",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals("second page limit", secondPage.pagination.limit, 3);
  TestValidator.equals("second page data count", secondPage.data.length, 3);
  // Ensure pages have different content
  const firstPageIds = firstPage.data.map((wiki) => wiki.id);
  const secondPageIds = secondPage.data.map((wiki) => wiki.id);
  TestValidator.notEquals(
    "pages have different content",
    firstPageIds,
    secondPageIds,
  );
  // Test empty community search using user connection
  const emptyCommunity =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10) + "-empty",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(emptyCommunity);
  const emptySearch =
    await api.functional.communityPlatform.communities.wikis.index(
      userConnection,
      {
        communityId: emptyCommunity.id,
        body: {
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommunityWiki.IRequest,
      },
    );
  typia.assert(emptySearch);
  // Validate empty search results
  TestValidator.equals(
    "empty community has no wiki pages",
    emptySearch.data.length,
    0,
  );
  TestValidator.equals(
    "empty community records count",
    emptySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty community pages count",
    emptySearch.pagination.pages,
    0,
  );
  // Test cross-community isolation - ensure wiki pages from other community are not returned
  const crossCommunitySearch =
    await api.functional.communityPlatform.communities.wikis.index(
      userConnection,
      {
        communityId: emptyCommunity.id,
        body: {
          limit: 20,
          page: 1,
        } satisfies ICommunityPlatformCommunityWiki.IRequest,
      },
    );
  typia.assert(crossCommunitySearch);
  // Should not return wiki pages from the first community
  TestValidator.equals(
    "cross-community isolation",
    crossCommunitySearch.data.length,
    0,
  );
}