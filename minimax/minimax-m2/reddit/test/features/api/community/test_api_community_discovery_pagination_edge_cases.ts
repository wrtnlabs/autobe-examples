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
 * Test community discovery pagination edge cases including requesting pages
 * beyond available data, invalid page numbers, large page limits approaching
 * maximum (100 items), and boundary conditions for pagination navigation.
 * Validates proper error handling and response formatting for pagination edge
 * cases.
 */
export async function test_api_community_discovery_pagination_edge_cases(
  connection: api.IConnection,
) {
  // Step 1: Register authenticated user for testing
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: userEmail,
        password: "testpassword123",
        href: "https://test.example.com",
        referrer: "https://test.example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Create sufficient test communities to test pagination boundaries
  // Create 150 communities to have enough data for pagination testing
  const communityCount = 150;
  const createdCommunities: IRedditPlatformCommunity[] = [];

  for (let i = 0; i < communityCount; i++) {
    const community: IRedditPlatformCommunity =
      await api.functional.redditPlatform.registeredUser.communities.create(
        connection,
        {
          body: {
            name: `test_community_${i}_${RandomGenerator.alphabets(5)}`,
            title: `Test Community ${i}`,
            description: `Description for test community ${i}`,
            type: "public",
            allow_text_posts: true,
            allow_link_posts: true,
            allow_image_posts: true,
            require_post_approval: false,
            require_comment_approval: false,
            nsfw_content_allowed: false,
          } satisfies IRedditPlatformCommunity.ICreate,
        },
      );
    typia.assert(community);
    createdCommunities.push(community);
  }

  // Step 3: Test maximum page limit (100 items per page)
  const maxLimitResult: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(maxLimitResult);

  // Validate pagination structure and data count
  TestValidator.equals(
    "maximum limit returns correct pagination metadata",
    maxLimitResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "maximum limit pagination shows correct limit",
    maxLimitResult.pagination.limit,
    100,
  );
  TestValidator.equals(
    "maximum limit returns 100 items",
    maxLimitResult.data.length,
    100,
  );
  TestValidator.equals(
    "pagination shows total records count",
    maxLimitResult.pagination.records,
    150,
  );
  TestValidator.equals(
    "pagination calculates correct total pages",
    maxLimitResult.pagination.pages,
    2,
  );

  // Step 4: Test second page with remaining items
  const secondPageResult: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          page: 2,
          limit: 100,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(secondPageResult);

  TestValidator.equals(
    "second page returns remaining items",
    secondPageResult.data.length,
    50,
  );
  TestValidator.equals(
    "second page pagination metadata",
    secondPageResult.pagination.current,
    2,
  );

  // Step 5: Test requesting page beyond available data
  const beyondAvailableResult: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          page: 10, // Requesting page 10 when only 2 pages exist
          limit: 20,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(beyondAvailableResult);

  TestValidator.equals(
    "requesting beyond available pages returns empty data",
    beyondAvailableResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination still shows correct total records",
    beyondAvailableResult.pagination.records,
    150,
  );
  TestValidator.equals(
    "current page reflects requested page even if empty",
    beyondAvailableResult.pagination.current,
    10,
  );

  // Step 6: Test large page number with small limit
  const largePageResult: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          page: 1000, // Very large page number
          limit: 20,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(largePageResult);

  TestValidator.equals(
    "large page number returns empty result",
    largePageResult.data.length,
    0,
  );
  TestValidator.equals(
    "large page number maintains pagination metadata",
    largePageResult.pagination.records,
    150,
  );

  // Step 7: Test boundary condition - last valid page with exact fit
  const lastPageExactFit: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          page: 15, // Last page with 10 items (15 * 10 = 150)
          limit: 10,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(lastPageExactFit);

  TestValidator.equals(
    "last page with exact fit returns 10 items",
    lastPageExactFit.data.length,
    10,
  );
  TestValidator.equals(
    "last page number is correct",
    lastPageExactFit.pagination.current,
    15,
  );

  // Step 8: Test medium page navigation (page 3 with limit 50)
  const mediumPageResult: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          page: 3,
          limit: 50,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(mediumPageResult);

  TestValidator.equals(
    "medium page navigation returns correct item count",
    mediumPageResult.data.length,
    50,
  );
  TestValidator.equals(
    "medium page current number",
    mediumPageResult.pagination.current,
    3,
  );

  // Step 9: Test error validation - invalid page numbers
  await TestValidator.error("requesting page 0 should fail", async () => {
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          page: 0, // Invalid: page must be >= 1
          limit: 20,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  });

  // Step 10: Test error validation - negative page number
  await TestValidator.error(
    "requesting negative page should fail",
    async () => {
      await api.functional.redditPlatform.registeredUser.communities.index(
        connection,
        {
          body: {
            page: -1, // Invalid: page must be >= 1
            limit: 20,
          } satisfies IRedditPlatformCommunity.IRequest,
        },
      );
    },
  );

  // Step 11: Test error validation - limit exceeding maximum
  await TestValidator.error(
    "requesting limit over 100 should fail",
    async () => {
      await api.functional.redditPlatform.registeredUser.communities.index(
        connection,
        {
          body: {
            page: 1,
            limit: 101, // Invalid: limit must be <= 100
          } satisfies IRedditPlatformCommunity.IRequest,
        },
      );
    },
  );

  // Step 12: Test pagination consistency across multiple requests
  const consistentResult1: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          page: 1,
          limit: 25,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(consistentResult1);

  const consistentResult2: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          page: 1,
          limit: 25,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(consistentResult2);

  TestValidator.equals(
    "pagination results are consistent",
    consistentResult1.data.length,
    consistentResult2.data.length,
  );
  TestValidator.equals(
    "pagination metadata is consistent",
    consistentResult1.pagination.records,
    consistentResult2.pagination.records,
  );

  // Step 13: Test edge case - very small limit with large page number
  const smallLimitLargePage: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          page: 50,
          limit: 1, // Very small limit
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(smallLimitLargePage);

  TestValidator.equals(
    "small limit with large page returns empty result",
    smallLimitLargePage.data.length,
    0,
  );
  TestValidator.equals(
    "total records count is maintained",
    smallLimitLargePage.pagination.records,
    150,
  );
}
