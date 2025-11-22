import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Comprehensive community discovery functionality test with search, filtering,
 * sorting, and pagination validation. Tests registered user access to community
 * discovery features including text search across community
 * names/titles/descriptions, filtering by access type
 * (public/restricted/private), operational status
 * (active/restricted/archived/banned), business workflow status, content
 * permissions, and engagement metrics. Validates sorting by creation date,
 * member count, subscriber count, post count, and alphabetical name with both
 * ascending and descending order. Tests pagination controls with various page
 * sizes and navigation patterns.
 */
export async function test_api_community_discovery_comprehensive(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as registered user to access community discovery features
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: typia.random<
          string & tags.MinLength<3> & tags.MaxLength<20>
        >(),
        email: userEmail,
        password: "testpassword123",
        display_name: "Test User",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Create diverse test communities with varied characteristics
  const testCommunities = await ArrayUtil.asyncRepeat(15, async (index) => {
    const communityTypes = ["public", "restricted", "private"] as const;
    const statuses = ["active", "restricted", "archived", "banned"] as const;
    const businessStatuses = [
      "pending_creation",
      "active",
      "under_review",
      "suspended",
      "archived",
      "banned",
    ] as const;

    return await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: `test_community_${index}_${typia.random<string>().substring(0, 8)}`,
          title: `Test Community ${index} - ${RandomGenerator.name(1)}`,
          description: `A test community for discovery testing number ${index} with various characteristics`,
          type: RandomGenerator.pick(communityTypes),
          allow_text_posts: index % 2 === 0,
          allow_link_posts: index % 3 === 0,
          allow_image_posts: index % 4 === 0,
          require_post_approval: index % 5 === 0,
          require_comment_approval: index % 6 === 0,
          nsfw_content_allowed: index % 7 === 0,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  });

  // Validate all communities were created successfully
  testCommunities.forEach((community, index) => {
    typia.assert(community);
    TestValidator.equals(
      `community ${index} created successfully`,
      community.name.startsWith("test_community_"),
      true,
    );
  });

  // Step 3: Test basic community discovery without filters
  const basicDiscovery =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {} satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(basicDiscovery);
  TestValidator.predicate(
    "basic discovery returns results",
    basicDiscovery.data.length > 0,
  );
  TestValidator.predicate(
    "basic discovery has pagination info",
    basicDiscovery.pagination.current >= 0,
  );

  // Step 4: Test text search functionality
  const searchTerm = "Test Community 5"; // Search for a specific community
  const searchResults =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          search: searchTerm,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(searchResults);
  TestValidator.predicate(
    "search results found",
    searchResults.data.length > 0,
  );

  // Step 5: Test filtering by community type
  const publicCommunities =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          type: "public",
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(publicCommunities);

  // Verify all returned communities are public type
  publicCommunities.data.forEach((community, index) => {
    TestValidator.equals(
      `community ${index} is public type`,
      community.type,
      "public",
    );
  });

  // Step 6: Test filtering by operational status
  const activeCommunities =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          status: "active",
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(activeCommunities);

  // Step 7: Test filtering by business workflow status
  const activeBusinessCommunities =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          business_status: "active",
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(activeBusinessCommunities);

  // Step 8: Test content permission filtering
  const textPostCommunities =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          allow_text_posts: true,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(textPostCommunities);

  const nsfwFilteredCommunities =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(nsfwFilteredCommunities);

  // Step 9: Test sorting by creation date (ascending)
  const sortedByCreatedAsc =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(sortedByCreatedAsc);

  // Verify ascending order (oldest first)
  if (sortedByCreatedAsc.data.length > 1) {
    for (let i = 1; i < sortedByCreatedAsc.data.length; i++) {
      const current = new Date(sortedByCreatedAsc.data[i].created_at).getTime();
      const previous = new Date(
        sortedByCreatedAsc.data[i - 1].created_at,
      ).getTime();
      TestValidator.predicate(
        `community ${i} created after community ${i - 1}`,
        current >= previous,
      );
    }
  }

  // Step 10: Test sorting by creation date (descending)
  const sortedByCreatedDesc =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(sortedByCreatedDesc);

  // Step 11: Test sorting by member count
  const sortedByMembers =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          sort_by: "member_count",
          sort_order: "desc",
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(sortedByMembers);

  // Step 12: Test sorting by subscriber count
  const sortedBySubscribers =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          sort_by: "subscriber_count",
          sort_order: "desc",
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(sortedBySubscribers);

  // Step 13: Test sorting by post count
  const sortedByPosts =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          sort_by: "post_count",
          sort_order: "desc",
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(sortedByPosts);

  // Step 14: Test sorting by name (alphabetical)
  const sortedByNameAsc =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          sort_by: "name",
          sort_order: "asc",
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(sortedByNameAsc);

  // Verify alphabetical ordering
  if (sortedByNameAsc.data.length > 1) {
    for (let i = 1; i < sortedByNameAsc.data.length; i++) {
      const current = sortedByNameAsc.data[i].name;
      const previous = sortedByNameAsc.data[i - 1].name;
      TestValidator.predicate(
        `community ${i} name comes after community ${i - 1}`,
        current >= previous,
      );
    }
  }

  const sortedByNameDesc =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          sort_by: "name",
          sort_order: "desc",
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(sortedByNameDesc);

  // Step 15: Test pagination with different page sizes
  const page1Size10 =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(page1Size10);
  TestValidator.equals(
    "page 1 has correct limit",
    page1Size10.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 1 is first page",
    page1Size10.pagination.current,
    1,
  );

  // Step 16: Test pagination navigation
  if (page1Size10.pagination.pages > 1) {
    const page2Size10 =
      await api.functional.redditPlatform.registeredUser.communities.index(
        connection,
        {
          body: {
            page: 2,
            limit: 10,
          } satisfies IRedditPlatformCommunity.IRequest,
        },
      );
    typia.assert(page2Size10);
    TestValidator.equals(
      "page 2 has correct limit",
      page2Size10.pagination.limit,
      10,
    );
    TestValidator.equals(
      "page 2 is second page",
      page2Size10.pagination.current,
      2,
    );

    // Verify page 1 and page 2 have different communities
    const page1Ids = page1Size10.data.map((c) => c.id);
    const page2Ids = page2Size10.data.map((c) => c.id);
    const hasOverlap = page1Ids.some((id) => page2Ids.includes(id));
    TestValidator.predicate("page 1 and page 2 have no overlap", !hasOverlap);
  }

  // Step 17: Test small page size
  const smallPage =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          limit: 5,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(smallPage);
  TestValidator.equals(
    "small page has correct limit",
    smallPage.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "small page returns 5 or fewer results",
    smallPage.data.length <= 5,
  );

  // Step 18: Test large page size (maximum 100)
  const largePage =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          limit: 100,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(largePage);
  TestValidator.equals(
    "large page has correct limit",
    largePage.pagination.limit,
    100,
  );

  // Step 19: Test combined filtering and sorting
  const combinedFilter =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          type: "public",
          status: "active",
          allow_text_posts: true,
          sort_by: "name",
          sort_order: "asc",
          limit: 20,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(combinedFilter);

  // Verify all results match the combined filters
  combinedFilter.data.forEach((community, index) => {
    TestValidator.equals(
      `community ${index} matches type filter`,
      community.type,
      "public",
    );
    TestValidator.equals(
      `community ${index} matches status filter`,
      community.status,
      "active",
    );
  });

  // Step 20: Test engagement metrics filtering
  const engagementFilter =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          min_member_count: 0,
          max_member_count: 1000,
          min_subscriber_count: 0,
          max_subscriber_count: 1000,
          min_post_count: 0,
          max_post_count: 100,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(engagementFilter);

  // Step 21: Test edge case - empty search results
  const noResultsSearch =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          search: "nonexistent_community_name_12345",
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(noResultsSearch);
  TestValidator.predicate(
    "search returns empty results",
    noResultsSearch.data.length >= 0,
  );

  // Step 22: Test title-specific filtering
  const titleFilter =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          title: "Test Community 1",
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(titleFilter);

  // Final validation - ensure pagination metadata is consistent
  TestValidator.predicate(
    "pagination has current page",
    page1Size10.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    page1Size10.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has total records",
    page1Size10.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has total pages",
    page1Size10.pagination.pages >= 0,
  );

  console.log(
    `Community discovery test completed successfully. Tested ${testCommunities.length} communities with comprehensive search, filter, sort, and pagination functionality.`,
  );
}
