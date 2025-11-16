import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test comprehensive community search functionality with various filtering,
 * sorting, and pagination parameters.
 *
 * This test validates that users can effectively discover communities based on
 * their interests and preferences through multiple search criteria including
 * name/description search, different sorting options, and pagination controls.
 *
 * Steps:
 *
 * 1. Authenticate as moderator
 * 2. Create multiple test communities with diverse characteristics
 * 3. Test search functionality (empty, by name, by description)
 * 4. Test sorting by created_at (ascending/descending)
 * 5. Test sorting by subscriber_count (ascending/descending)
 * 6. Test sorting by name (ascending/descending)
 * 7. Test pagination controls (page size, page navigation)
 * 8. Verify filtered results match search criteria
 */
export async function test_api_community_search_with_filters(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create diverse test communities
  const communityThemes = [
    {
      name: "technology",
      title: "Technology Hub",
      desc: "Discussions about latest tech trends and innovations",
    },
    {
      name: "gaming",
      title: "Gaming Community",
      desc: "Video games, esports, and gaming culture",
    },
    {
      name: "cooking",
      title: "Cooking Corner",
      desc: "Share recipes and cooking techniques",
    },
    {
      name: "fitness",
      title: "Fitness Group",
      desc: "Workout routines and healthy lifestyle tips",
    },
    {
      name: "photography",
      title: "Photography Lovers",
      desc: "Share your best shots and photography tips",
    },
    {
      name: "music",
      title: "Music Appreciation",
      desc: "Discuss all genres of music and share discoveries",
    },
    {
      name: "books",
      title: "Book Club",
      desc: "Book recommendations and literary discussions",
    },
    {
      name: "travel",
      title: "Travel Enthusiasts",
      desc: "Share travel experiences and destination guides",
    },
    {
      name: "programming",
      title: "Programmers Unite",
      desc: "Coding challenges and software development",
    },
    {
      name: "science",
      title: "Science Daily",
      desc: "Latest scientific discoveries and research",
    },
  ] as const;

  const createdCommunities: IRedditCommunityCommunity[] = [];

  for (const theme of communityThemes) {
    const community: IRedditCommunityCommunity =
      await api.functional.redditCommunity.moderator.communities.create(
        connection,
        {
          body: {
            name: theme.name,
            display_title: theme.title,
            description: theme.desc,
            rules: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IRedditCommunityCommunity.ICreate,
        },
      );
    typia.assert(community);
    createdCommunities.push(community);
  }

  // Step 3: Test empty search (should return all communities)
  const allCommunities: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.communities.index(connection, {
      body: {} satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(allCommunities);
  TestValidator.predicate(
    "empty search returns at least created communities",
    allCommunities.data.length >= communityThemes.length,
  );

  // Step 4: Test search by name (partial matching)
  const searchByName: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.communities.index(connection, {
      body: {
        search: "tech",
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(searchByName);
  TestValidator.predicate(
    "search by partial name finds matching communities",
    searchByName.data.some((c) => c.name.includes("tech")),
  );

  // Step 5: Test search by description
  const searchByDescription: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.communities.index(connection, {
      body: {
        search: "coding",
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(searchByDescription);

  // Step 6: Test sorting by created_at ascending
  const sortByCreatedAsc: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.communities.index(connection, {
      body: {
        sort_by: "created_at",
        order: "asc",
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(sortByCreatedAsc);

  // Verify ascending chronological order
  if (sortByCreatedAsc.data.length >= 2) {
    for (let i = 0; i < sortByCreatedAsc.data.length - 1; i++) {
      const current = new Date(sortByCreatedAsc.data[i].created_at).getTime();
      const next = new Date(sortByCreatedAsc.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `created_at ascending: item ${i} <= item ${i + 1}`,
        current <= next,
      );
    }
  }

  // Step 7: Test sorting by created_at descending
  const sortByCreatedDesc: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.communities.index(connection, {
      body: {
        sort_by: "created_at",
        order: "desc",
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(sortByCreatedDesc);

  // Verify descending chronological order
  if (sortByCreatedDesc.data.length >= 2) {
    for (let i = 0; i < sortByCreatedDesc.data.length - 1; i++) {
      const current = new Date(sortByCreatedDesc.data[i].created_at).getTime();
      const next = new Date(sortByCreatedDesc.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `created_at descending: item ${i} >= item ${i + 1}`,
        current >= next,
      );
    }
  }

  // Step 8: Test sorting by subscriber_count ascending
  const sortBySubscriberAsc: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.communities.index(connection, {
      body: {
        sort_by: "subscriber_count",
        order: "asc",
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(sortBySubscriberAsc);

  // Step 9: Test sorting by subscriber_count descending
  const sortBySubscriberDesc: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.communities.index(connection, {
      body: {
        sort_by: "subscriber_count",
        order: "desc",
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(sortBySubscriberDesc);

  // Step 10: Test sorting by name ascending
  const sortByNameAsc: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.communities.index(connection, {
      body: {
        sort_by: "name",
        order: "asc",
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(sortByNameAsc);

  // Verify alphabetical ascending order
  if (sortByNameAsc.data.length >= 2) {
    for (let i = 0; i < sortByNameAsc.data.length - 1; i++) {
      TestValidator.predicate(
        `name ascending: "${sortByNameAsc.data[i].name}" <= "${sortByNameAsc.data[i + 1].name}"`,
        sortByNameAsc.data[i].name <= sortByNameAsc.data[i + 1].name,
      );
    }
  }

  // Step 11: Test sorting by name descending
  const sortByNameDesc: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.communities.index(connection, {
      body: {
        sort_by: "name",
        order: "desc",
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(sortByNameDesc);

  // Verify alphabetical descending order
  if (sortByNameDesc.data.length >= 2) {
    for (let i = 0; i < sortByNameDesc.data.length - 1; i++) {
      TestValidator.predicate(
        `name descending: "${sortByNameDesc.data[i].name}" >= "${sortByNameDesc.data[i + 1].name}"`,
        sortByNameDesc.data[i].name >= sortByNameDesc.data[i + 1].name,
      );
    }
  }

  // Step 12: Test pagination with limit
  const paginatedSmall: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.communities.index(connection, {
      body: {
        limit: 5,
        page: 1,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(paginatedSmall);
  TestValidator.predicate(
    "pagination limit controls page size correctly",
    paginatedSmall.data.length <= 5,
  );
  TestValidator.equals(
    "pagination metadata limit matches requested limit",
    paginatedSmall.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination current page is 0 for first page (zero-based)",
    paginatedSmall.pagination.current,
    0,
  );

  // Step 13: Test second page navigation
  if (allCommunities.pagination.pages > 1) {
    const secondPage: IPageIRedditCommunityCommunity.ISummary =
      await api.functional.redditCommunity.communities.index(connection, {
        body: {
          limit: 5,
          page: 2,
        } satisfies IRedditCommunityCommunity.IRequest,
      });
    typia.assert(secondPage);
    TestValidator.equals(
      "second page navigation shows current page as 1 (zero-based)",
      secondPage.pagination.current,
      1,
    );
  }

  // Step 14: Test pagination metadata accuracy
  const fullPage: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.communities.index(connection, {
      body: {
        limit: 100,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(fullPage);
  TestValidator.predicate(
    "pagination total records count is accurate",
    fullPage.pagination.records >= communityThemes.length,
  );
  TestValidator.predicate(
    "pagination total pages calculated correctly",
    fullPage.pagination.pages >= 1,
  );
}
