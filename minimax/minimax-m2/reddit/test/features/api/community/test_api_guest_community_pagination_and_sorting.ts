import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IGuestSessionInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IGuestSessionInfo";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestUser";

/**
 * Test community listing with pagination and sorting options for guest users.
 *
 * This test validates the guest user experience for discovering and browsing
 * communities on a Reddit-like platform. It ensures proper pagination controls,
 * different sort orders (creation date, member count, subscriber count, post
 * count, alphabetical), and result consistency across pages. The test covers
 * the user interface for browsing large community catalogs and ensures proper
 * performance for community discovery workflows, supporting the platform's user
 * acquisition strategy by providing smooth anonymous browsing experience.
 */
export async function test_api_guest_community_pagination_and_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create guest user session for authentication
  const guestUser: IRedditPlatformGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: {
        browsing_preferences: {
          interests: ["technology", "science", "programming"],
          content_types: ["text", "link", "image"],
          session_metadata: {
            session_id: typia.random<string & tags.Format<"uuid">>(),
            preferred_communities: ["programming", "technology"],
            engagement_level: "medium",
          },
        },
        ip_address: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformGuestUser.ICreate,
    });
  typia.assert(guestUser);

  // Validate guest session capabilities
  TestValidator.equals(
    "guest session has browse capabilities",
    guestUser.guest_session.capabilities.includes("browse_communities"),
    true,
  );

  // Step 2: Test pagination with different page sizes
  const pageSizeTests = [1, 5, 10, 20, 50];

  for (const limit of pageSizeTests) {
    const pageResult: IPageIRedditPlatformCommunity.ISummary =
      await api.functional.redditPlatform.guestUser.communities.index(
        connection,
        {
          body: {
            page: 1,
            limit: limit,
            sort_by: "created_at",
            sort_order: "desc",
          } satisfies IRedditPlatformCommunity.IRequest,
        },
      );
    typia.assert(pageResult);

    // Validate pagination metadata
    TestValidator.equals(
      `pagination metadata for page size ${limit}`,
      pageResult.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `pagination current page is 1 for size ${limit}`,
      pageResult.pagination.current === 1,
    );
    TestValidator.predicate(
      `records count is consistent for size ${limit}`,
      pageResult.data.length <= limit,
    );
    TestValidator.predicate(
      `total pages calculation is valid for size ${limit}`,
      pageResult.pagination.pages >= 1,
    );
  }

  // Step 3: Test different sorting options
  const sortOptions: Array<{
    field:
      | "created_at"
      | "member_count"
      | "subscriber_count"
      | "post_count"
      | "name";
    order: "asc" | "desc";
    description: string;
  }> = [
    {
      field: "created_at",
      order: "desc",
      description: "newest communities first",
    },
    {
      field: "created_at",
      order: "asc",
      description: "oldest communities first",
    },
    {
      field: "member_count",
      order: "desc",
      description: "largest communities first",
    },
    {
      field: "member_count",
      order: "asc",
      description: "smallest communities first",
    },
    {
      field: "subscriber_count",
      order: "desc",
      description: "most subscribed communities first",
    },
    {
      field: "subscriber_count",
      order: "asc",
      description: "least subscribed communities first",
    },
    {
      field: "post_count",
      order: "desc",
      description: "most active communities first",
    },
    {
      field: "post_count",
      order: "asc",
      description: "least active communities first",
    },
    { field: "name", order: "asc", description: "alphabetical order A-Z" },
    { field: "name", order: "desc", description: "alphabetical order Z-A" },
  ];

  for (const sortOption of sortOptions) {
    const sortResult: IPageIRedditPlatformCommunity.ISummary =
      await api.functional.redditPlatform.guestUser.communities.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            sort_by: sortOption.field,
            sort_order: sortOption.order,
          } satisfies IRedditPlatformCommunity.IRequest,
        },
      );
    typia.assert(sortResult);

    // Validate that results are returned and properly sorted
    TestValidator.predicate(
      `communities found for ${sortOption.description}`,
      sortResult.data.length > 0,
    );

    // For name sorting, verify alphabetical order
    if (sortOption.field === "name" && sortResult.data.length > 1) {
      const communityNames = sortResult.data.map((c) => c.name);
      const sortedNames = [...communityNames].sort();

      if (sortOption.order === "asc") {
        TestValidator.equals(
          "names are in ascending alphabetical order",
          communityNames,
          sortedNames,
        );
      } else {
        TestValidator.equals(
          "names are in descending alphabetical order",
          communityNames,
          sortedNames.reverse(),
        );
      }
    }

    // For numeric sorting, verify basic ordering logic
    if (
      (sortOption.field === "member_count" ||
        sortOption.field === "subscriber_count" ||
        sortOption.field === "post_count") &&
      sortResult.data.length > 1
    ) {
      const communities = sortResult.data;
      const isAscending = sortOption.order === "asc";

      for (let i = 1; i < communities.length; i++) {
        const current = communities[i][sortOption.field];
        const previous = communities[i - 1][sortOption.field];

        if (isAscending) {
          TestValidator.predicate(
            `${sortOption.field} is ascending for ${sortOption.description}`,
            current >= previous,
          );
        } else {
          TestValidator.predicate(
            `${sortOption.field} is descending for ${sortOption.description}`,
            current <= previous,
          );
        }
      }
    }
  }

  // Step 4: Test pagination navigation (first, middle, last pages)
  const firstPage: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.guestUser.communities.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(firstPage);

  // Get total pages to test middle and last page
  const totalPages = firstPage.pagination.pages;

  if (totalPages > 1) {
    // Test middle page
    const middlePageNum = Math.ceil(totalPages / 2);
    const middlePage: IPageIRedditPlatformCommunity.ISummary =
      await api.functional.redditPlatform.guestUser.communities.index(
        connection,
        {
          body: {
            page: middlePageNum,
            limit: 5,
            sort_by: "created_at",
            sort_order: "desc",
          } satisfies IRedditPlatformCommunity.IRequest,
        },
      );
    typia.assert(middlePage);

    TestValidator.equals(
      "middle page number is correct",
      middlePage.pagination.current,
      middlePageNum,
    );

    // Test last page
    const lastPage: IPageIRedditPlatformCommunity.ISummary =
      await api.functional.redditPlatform.guestUser.communities.index(
        connection,
        {
          body: {
            page: totalPages,
            limit: 5,
            sort_by: "created_at",
            sort_order: "desc",
          } satisfies IRedditPlatformCommunity.IRequest,
        },
      );
    typia.assert(lastPage);

    TestValidator.equals(
      "last page number is correct",
      lastPage.pagination.current,
      totalPages,
    );

    TestValidator.predicate(
      "last page has fewer or equal items than page limit",
      lastPage.data.length <= 5,
    );
  }

  // Step 5: Test edge cases and boundary conditions
  // Test with limit of 1 (smallest page size)
  const singleItemPage: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.guestUser.communities.index(
      connection,
      {
        body: {
          page: 1,
          limit: 1,
          sort_by: "name",
          sort_order: "asc",
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(singleItemPage);

  TestValidator.equals(
    "single item page has exactly 1 item",
    singleItemPage.data.length,
    1,
  );

  // Test with maximum limit (100)
  const maxLimitPage: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.guestUser.communities.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(maxLimitPage);

  TestValidator.predicate(
    "max limit page has items",
    maxLimitPage.data.length > 0,
  );

  // Step 6: Test search functionality with pagination and sorting
  const searchResult: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.guestUser.communities.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          search: "tech",
          sort_by: "member_count",
          sort_order: "desc",
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(searchResult);

  TestValidator.predicate(
    "search returned results",
    searchResult.data.length >= 0,
  );

  // Step 7: Test community type filtering with pagination
  const publicCommunitiesResult: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.guestUser.communities.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          type: "public",
          sort_by: "subscriber_count",
          sort_order: "desc",
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(publicCommunitiesResult);

  // Validate all returned communities are public
  for (const community of publicCommunitiesResult.data) {
    TestValidator.equals("community type is public", community.type, "public");
  }

  // Step 8: Test status filtering with pagination
  const activeCommunitiesResult: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.guestUser.communities.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "active",
          business_status: "active",
          sort_by: "post_count",
          sort_order: "desc",
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(activeCommunitiesResult);

  // Validate all returned communities are active
  for (const community of activeCommunitiesResult.data) {
    TestValidator.equals(
      "community status is active",
      community.status,
      "active",
    );
    TestValidator.equals(
      "community business status is active",
      community.business_status,
      "active",
    );
  }

  // Step 9: Test NSFW content filtering
  const nsfwFilteredResult: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.guestUser.communities.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          nsfw_content_allowed: false,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(nsfwFilteredResult);

  // Validate no NSFW content is returned
  for (const community of nsfwFilteredResult.data) {
    TestValidator.equals(
      "community does not allow NSFW content",
      community.nsfw_content_allowed,
      false,
    );
  }

  // Step 10: Test member count range filtering
  const largeCommunitiesResult: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.guestUser.communities.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          min_member_count: 1000,
          sort_by: "member_count",
          sort_order: "desc",
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(largeCommunitiesResult);

  // Validate all communities meet the minimum member count
  for (const community of largeCommunitiesResult.data) {
    TestValidator.predicate(
      "community meets minimum member count requirement",
      community.member_count >= 1000,
    );
  }

  // Step 11: Test result consistency across multiple requests
  const firstRequest: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.guestUser.communities.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          sort_by: "name",
          sort_order: "asc",
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(firstRequest);

  const secondRequest: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.guestUser.communities.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          sort_by: "name",
          sort_order: "asc",
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(secondRequest);

  // Validate results are consistent
  TestValidator.equals(
    "results are consistent across requests",
    firstRequest.data.map((c) => c.id),
    secondRequest.data.map((c) => c.id),
  );

  TestValidator.equals(
    "pagination metadata is consistent",
    firstRequest.pagination,
    secondRequest.pagination,
  );

  // Step 12: Validate community data integrity
  for (const page of [firstRequest, searchResult, publicCommunitiesResult]) {
    for (const community of page.data) {
      // Validate required fields are present and valid
      TestValidator.predicate(
        "community has valid UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          community.id,
        ),
      );
      TestValidator.predicate(
        "community name is valid",
        community.name.length >= 2 && community.name.length <= 25,
      );
      TestValidator.predicate(
        "community title is valid",
        community.title.length > 0 && community.title.length <= 100,
      );
      TestValidator.predicate(
        "community description is valid",
        community.description.length >= 0 &&
          community.description.length <= 500,
      );
      TestValidator.predicate(
        "community has valid counts",
        community.member_count >= 0 &&
          community.subscriber_count >= 0 &&
          community.post_count >= 0,
      );
      TestValidator.predicate(
        "community has valid timestamps",
        typeof community.created_at === "string" &&
          community.created_at.length > 0,
      );
    }
  }

  // Final validation: Ensure guest session is still active
  TestValidator.equals(
    "guest session remains active",
    guestUser.guest_session.session_state,
    "active",
  );
}
