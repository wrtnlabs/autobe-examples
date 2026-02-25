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

export async function test_api_wiki_search_content_mapping(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register a user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAuth);
  // Create moderator connection and register a moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderatorAuth);
  // Create a community
  const community =
    await api.functional.communityPlatform.user.communities.create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create wiki pages with varied content for search testing using utility function
  const searchTerm = "trigram";
  const wikiPages = [];
  // Wiki page with search term only in title
  const titleOnlyWiki =
    await generate_random_community_platform_moderator_communities_wikis_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: {
          title: `Wiki about ${searchTerm} indexing`,
          slug: "title-only-wiki",
          content:
            "This wiki page discusses general database concepts without mentioning the specific search term.",
          status: "published",
        } satisfies ICommunityPlatformCommunityWiki.ICreate,
      },
    );
  typia.assert(titleOnlyWiki);
  wikiPages.push(titleOnlyWiki);
  // Wiki page with search term only in content
  const contentOnlyWiki =
    await generate_random_community_platform_moderator_communities_wikis_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: {
          title: "Database Indexing Methods",
          slug: "content-only-wiki",
          content: `This article explains various indexing techniques including ${searchTerm} indexes for text search.`,
          status: "published",
        } satisfies ICommunityPlatformCommunityWiki.ICreate,
      },
    );
  typia.assert(contentOnlyWiki);
  wikiPages.push(contentOnlyWiki);
  // Wiki page with search term in both title and content
  const bothFieldsWiki =
    await generate_random_community_platform_moderator_communities_wikis_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: {
          title: `Understanding ${searchTerm} Search`,
          slug: "both-fields-wiki",
          content: `This comprehensive guide covers ${searchTerm} indexing and its applications in full-text search systems.`,
          status: "published",
        } satisfies ICommunityPlatformCommunityWiki.ICreate,
      },
    );
  typia.assert(bothFieldsWiki);
  wikiPages.push(bothFieldsWiki);
  // Wiki page without search term
  const noMatchWiki =
    await generate_random_community_platform_moderator_communities_wikis_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: {
          title: "Introduction to Databases",
          slug: "no-match-wiki",
          content:
            "This article provides a basic introduction to database management systems and their fundamental concepts.",
          status: "published",
        } satisfies ICommunityPlatformCommunityWiki.ICreate,
      },
    );
  typia.assert(noMatchWiki);
  wikiPages.push(noMatchWiki);
  // Create a search connection (no authentication required for search endpoint)
  const searchConnection: api.IConnection = { host: connection.host };
  // Test search functionality with the search term
  const searchResults =
    await api.functional.communityPlatform.communities.wikis.index(
      searchConnection,
      {
        communityId: community.id,
        body: {
          search: searchTerm,
        } satisfies ICommunityPlatformCommunityWiki.IRequest,
      },
    );
  typia.assert(searchResults);
  // Verify search returns matches from both title and content fields
  TestValidator.equals(
    "search results should include title-only match",
    searchResults.data.some((wiki) => wiki.id === titleOnlyWiki.id),
    true,
  );
  TestValidator.equals(
    "search results should include content-only match",
    searchResults.data.some((wiki) => wiki.id === contentOnlyWiki.id),
    true,
  );
  TestValidator.equals(
    "search results should include both-fields match",
    searchResults.data.some((wiki) => wiki.id === bothFieldsWiki.id),
    true,
  );
  TestValidator.equals(
    "search results should exclude non-matching wiki",
    searchResults.data.some((wiki) => wiki.id === noMatchWiki.id),
    false,
  );
  // Test empty search term returns all pages when combined with status filter
  const emptySearchResults =
    await api.functional.communityPlatform.communities.wikis.index(
      searchConnection,
      {
        communityId: community.id,
        body: {
          search: "",
          status: "published",
        } satisfies ICommunityPlatformCommunityWiki.IRequest,
      },
    );
  typia.assert(emptySearchResults);
  TestValidator.equals(
    "empty search with status filter should return all published pages",
    emptySearchResults.data.length,
    wikiPages.length,
  );
  // Test very short search term (minimum length for trigram - 3 characters)
  const shortSearchResults =
    await api.functional.communityPlatform.communities.wikis.index(
      searchConnection,
      {
        communityId: community.id,
        body: {
          search: "tri", // 3 characters - minimum for trigram
        } satisfies ICommunityPlatformCommunityWiki.IRequest,
      },
    );
  typia.assert(shortSearchResults);
  TestValidator.predicate(
    "short search term should return results",
    shortSearchResults.data.length > 0,
  );
  // Test special characters in search terms
  const specialCharSearchResults =
    await api.functional.communityPlatform.communities.wikis.index(
      searchConnection,
      {
        communityId: community.id,
        body: {
          search: "trigram-index",
        } satisfies ICommunityPlatformCommunityWiki.IRequest,
      },
    );
  typia.assert(specialCharSearchResults);
  // Test limit parameter boundaries
  const limit1Results =
    await api.functional.communityPlatform.communities.wikis.index(
      searchConnection,
      {
        communityId: community.id,
        body: {
          search: searchTerm,
          limit: 1,
        } satisfies ICommunityPlatformCommunityWiki.IRequest,
      },
    );
  typia.assert(limit1Results);
  TestValidator.equals(
    "limit 1 should return exactly 1 result",
    limit1Results.data.length,
    1,
  );
  const limit100Results =
    await api.functional.communityPlatform.communities.wikis.index(
      searchConnection,
      {
        communityId: community.id,
        body: {
          search: searchTerm,
          limit: 100,
        } satisfies ICommunityPlatformCommunityWiki.IRequest,
      },
    );
  typia.assert(limit100Results);
  TestValidator.predicate(
    "limit 100 should return multiple results",
    limit100Results.data.length >= 1,
  );
  // Test default behavior when limit is not provided
  const defaultLimitResults =
    await api.functional.communityPlatform.communities.wikis.index(
      searchConnection,
      {
        communityId: community.id,
        body: {
          search: searchTerm,
        } satisfies ICommunityPlatformCommunityWiki.IRequest,
      },
    );
  typia.assert(defaultLimitResults);
  TestValidator.predicate(
    "default limit should return results",
    defaultLimitResults.data.length >= 1,
  );
  // Verify author information is included and matches actual user
  for (const wiki of searchResults.data) {
    TestValidator.equals(
      "wiki author should have id",
      typeof wiki.author.id,
      "string",
    );
    TestValidator.equals(
      "wiki author should have username",
      typeof wiki.author.username,
      "string",
    );
    TestValidator.predicate(
      "wiki author should have valid display_name",
      wiki.author.display_name === null ||
        typeof wiki.author.display_name === "string",
    );
    TestValidator.predicate(
      "wiki author should have valid avatar_url",
      wiki.author.avatar_url === null ||
        typeof wiki.author.avatar_url === "string",
    );
    TestValidator.equals(
      "wiki author should have karma",
      typeof wiki.author.karma,
      "number",
    );
    TestValidator.equals(
      "wiki author should have created_at",
      typeof wiki.author.created_at,
      "string",
    );
  }
}
