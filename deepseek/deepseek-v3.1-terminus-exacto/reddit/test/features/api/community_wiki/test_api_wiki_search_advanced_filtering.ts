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

export async function test_api_wiki_search_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup authentication for multiple actors
  const userConnection: api.IConnection = { host: connection.host };
  const moderatorConnection: api.IConnection = { host: connection.host };
  const anonymousConnection: api.IConnection = { host: connection.host };
  // Create and authenticate user
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create and authenticate moderator
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // 2. Create a community
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
  // 3. Create wiki pages with different statuses and timestamps
  const wikiPages: ICommunityPlatformCommunityWiki[] = [];
  // Published wiki page with "advanced" in title (created now)
  const publishedWiki1 =
    await generate_random_community_platform_moderator_communities_wikis_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: {
          title: "Advanced Search Features",
          slug: "advanced-search-features",
          content: RandomGenerator.content({ paragraphs: 2 }),
          status: "published",
        } satisfies ICommunityPlatformCommunityWiki.ICreate,
      },
    );
  typia.assert(publishedWiki1);
  wikiPages.push(publishedWiki1);
  // Add small delay to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Published wiki page with "filtering" in title (created later)
  const publishedWiki2 =
    await generate_random_community_platform_moderator_communities_wikis_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: {
          title: "Powerful Filtering Options",
          slug: "powerful-filtering-options",
          content: RandomGenerator.content({ paragraphs: 3 }),
          status: "published",
        } satisfies ICommunityPlatformCommunityWiki.ICreate,
      },
    );
  typia.assert(publishedWiki2);
  wikiPages.push(publishedWiki2);
  // Draft wiki page
  const draftWiki =
    await generate_random_community_platform_moderator_communities_wikis_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: {
          title: "Draft: Upcoming Search Features",
          slug: "draft-upcoming-search-features",
          content: RandomGenerator.content({ paragraphs: 1 }),
          status: "draft",
        } satisfies ICommunityPlatformCommunityWiki.ICreate,
      },
    );
  typia.assert(draftWiki);
  wikiPages.push(draftWiki);
  // Archived wiki page
  const archivedWiki =
    await generate_random_community_platform_moderator_communities_wikis_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: {
          title: "Legacy Search Documentation",
          slug: "legacy-search-documentation",
          content: RandomGenerator.content({ paragraphs: 2 }),
          status: "archived",
        } satisfies ICommunityPlatformCommunityWiki.ICreate,
      },
    );
  typia.assert(archivedWiki);
  wikiPages.push(archivedWiki);
  // Wait a moment to ensure timestamps are recorded
  await new Promise((resolve) => setTimeout(resolve, 100));
  const laterTime = new Date().toISOString();
  // 4. Test filtering by status=published (use anonymous connection for public search)
  const publishedResults =
    await api.functional.communityPlatform.communities.wikis.index(
      anonymousConnection,
      {
        communityId: community.id,
        body: {
          status: "published",
        } satisfies ICommunityPlatformCommunityWiki.IRequest,
      },
    );
  typia.assert(publishedResults);
  TestValidator.equals(
    "published filter returns only published pages",
    publishedResults.data.length,
    2,
  );
  // Verify all returned pages are published and draft/archived are excluded
  publishedResults.data.forEach((page) => {
    TestValidator.equals(
      "page status should be published",
      page.status,
      "published",
    );
  });
  // Verify draft and archived pages are not in published results
  TestValidator.predicate(
    "draft page excluded from published results",
    !publishedResults.data.some((p) => p.id === draftWiki.id),
  );
  TestValidator.predicate(
    "archived page excluded from published results",
    !publishedResults.data.some((p) => p.id === archivedWiki.id),
  );
  // 5. Test date range filtering
  const dateFilterResults =
    await api.functional.communityPlatform.communities.wikis.index(
      anonymousConnection,
      {
        communityId: community.id,
        body: {
          created_from: wikiPages[0].created_at,
          created_to: laterTime,
        } satisfies ICommunityPlatformCommunityWiki.IRequest,
      },
    );
  typia.assert(dateFilterResults);
  // Should return pages created within the specified range
  dateFilterResults.data.forEach((page) => {
    const pageCreatedAt = new Date(page.created_at).getTime();
    const rangeStart = new Date(wikiPages[0].created_at).getTime();
    const rangeEnd = new Date(laterTime).getTime();
    TestValidator.predicate(
      "date range filter: page within specified range",
      pageCreatedAt >= rangeStart && pageCreatedAt <= rangeEnd,
    );
  });
  // 6. Test partial text search with trigram functionality
  const searchResultsAdvanced =
    await api.functional.communityPlatform.communities.wikis.index(
      anonymousConnection,
      {
        communityId: community.id,
        body: {
          search: "advanced",
        } satisfies ICommunityPlatformCommunityWiki.IRequest,
      },
    );
  typia.assert(searchResultsAdvanced);
  TestValidator.predicate(
    "partial search 'advanced' finds relevant pages",
    searchResultsAdvanced.data.length > 0,
  );
  // Verify search results contain the search term (case-insensitive)
  TestValidator.predicate(
    "search results contain search term",
    searchResultsAdvanced.data.some((page) =>
      page.title.toLowerCase().includes("advanced"),
    ),
  );
  // Test case-insensitive search
  const searchResultsMixedCase =
    await api.functional.communityPlatform.communities.wikis.index(
      anonymousConnection,
      {
        communityId: community.id,
        body: {
          search: "AdVaNcEd",
        } satisfies ICommunityPlatformCommunityWiki.IRequest,
      },
    );
  typia.assert(searchResultsMixedCase);
  // Verify mixed case returns same pages as lowercase search
  TestValidator.equals(
    "case-insensitive search returns same number of results",
    searchResultsMixedCase.data.length,
    searchResultsAdvanced.data.length,
  );
  // Verify both searches return the same page IDs
  const advancedIds = searchResultsAdvanced.data.map((p) => p.id).sort();
  const mixedCaseIds = searchResultsMixedCase.data.map((p) => p.id).sort();
  TestValidator.equals(
    "case-insensitive search returns identical pages",
    advancedIds,
    mixedCaseIds,
  );
  // 7. Test combined filters (published + search + date range)
  const combinedResults =
    await api.functional.communityPlatform.communities.wikis.index(
      anonymousConnection,
      {
        communityId: community.id,
        body: {
          status: "published",
          search: "filtering",
          created_from: wikiPages[0].created_at,
        } satisfies ICommunityPlatformCommunityWiki.IRequest,
      },
    );
  typia.assert(combinedResults);
  // Verify all combined filter conditions are met
  combinedResults.data.forEach((page) => {
    TestValidator.equals(
      "combined filters: status check",
      page.status,
      "published",
    );
    TestValidator.predicate(
      "combined filters: title contains search term",
      page.title.toLowerCase().includes("filtering"),
    );
    const pageCreatedAt = new Date(page.created_at).getTime();
    const rangeStart = new Date(wikiPages[0].created_at).getTime();
    TestValidator.predicate(
      "combined filters: creation date after range start",
      pageCreatedAt >= rangeStart,
    );
  });
  // 8. Test pagination
  const paginatedResults =
    await api.functional.communityPlatform.communities.wikis.index(
      anonymousConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies ICommunityPlatformCommunityWiki.IRequest,
      },
    );
  typia.assert(paginatedResults);
  TestValidator.equals(
    "pagination limit works",
    paginatedResults.data.length,
    2,
  );
  TestValidator.predicate(
    "pagination metadata exists",
    paginatedResults.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination records count",
    paginatedResults.pagination.records >= wikiPages.length,
  );
}
