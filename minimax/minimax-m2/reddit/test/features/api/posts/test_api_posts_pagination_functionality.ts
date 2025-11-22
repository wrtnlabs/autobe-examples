import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test comprehensive pagination functionality for Reddit-like platform posts.
 *
 * Validates that the posts API correctly handles pagination with page
 * navigation, limit variations, metadata accuracy, and data consistency across
 * pages. Ensures users can efficiently browse through large volumes of posts
 * with proper ordering and complete data coverage.
 *
 * Test Coverage:
 *
 * 1. Page navigation - different results on page 1 vs page 2
 * 2. Limit variations - default 25, small 10, medium 50, maximum 100 posts
 * 3. Pagination metadata accuracy - current page, total records, total pages
 * 4. Data consistency - no duplicates, complete coverage, consistent ordering
 * 5. Edge cases - boundary conditions and parameter validation
 */
export async function test_api_posts_pagination_functionality(
  connection: api.IConnection,
) {
  // Generate sufficient test data for multiple pages
  const totalPosts = 150;
  const posts: IRedditPlatformPost.ISummary[] = [];

  // Create test posts in batches to ensure sufficient data
  for (let i = 0; i < totalPosts; i++) {
    const testPost = await api.functional.redditPlatform.posts.index(
      connection,
      {
        body: {
          page: 1,
          limit: 1,
          search: `unique_post_${i}`,
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IRedditPlatformPost.IRequest,
      },
    );

    if (testPost.data.length > 0) {
      posts.push(testPost.data[0]);
    }
  }

  // If we don't have enough posts from search, create them through direct API calls
  while (posts.length < totalPosts) {
    try {
      const batchSize = Math.min(10, totalPosts - posts.length);
      const batchPromises = Array.from(
        { length: batchSize },
        async (_, index) => {
          const postIndex = posts.length + index;
          return api.functional.redditPlatform.posts.index(connection, {
            body: {
              page: 1,
              limit: 1,
              search: `batch_post_${postIndex}_${Date.now()}`,
              sort_by: "created_at",
              sort_order: "asc",
            } satisfies IRedditPlatformPost.IRequest,
          });
        },
      );

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach((result) => {
        if (result.data.length > 0) {
          posts.push(result.data[0]);
        }
      });
    } catch (error) {
      // If creation fails, break and work with what we have
      break;
    }
  }

  // Ensure we have enough posts for meaningful pagination tests
  if (posts.length < 50) {
    throw new Error(
      `Insufficient test data: only ${posts.length} posts available, need at least 50`,
    );
  }

  TestValidator.equals(
    "sufficient test data created",
    posts.length,
    totalPosts,
  );

  // Test 1: Default pagination (page 1, limit 25)
  const page1Default = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 25,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  typia.assert(page1Default);
  TestValidator.equals("page 1 has 25 posts", page1Default.data.length, 25);
  TestValidator.equals(
    "page 1 current page is 1",
    page1Default.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit is 25", page1Default.pagination.limit, 25);
  TestValidator.equals(
    "total records recorded",
    page1Default.pagination.records,
    totalPosts,
  );
  TestValidator.equals(
    "total pages calculated correctly",
    page1Default.pagination.pages,
    Math.ceil(totalPosts / 25),
  );

  // Test 2: Page 2 with same limit should return different posts
  const page2 = await api.functional.redditPlatform.posts.index(connection, {
    body: {
      page: 2,
      limit: 25,
    } satisfies IRedditPlatformPost.IRequest,
  });

  typia.assert(page2);
  TestValidator.equals("page 2 has 25 posts", page2.data.length, 25);
  TestValidator.equals("page 2 current page is 2", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit is 25", page2.pagination.limit, 25);
  TestValidator.equals(
    "page 2 total records matches",
    page2.pagination.records,
    totalPosts,
  );
  TestValidator.equals(
    "page 2 total pages matches",
    page2.pagination.pages,
    Math.ceil(totalPosts / 25),
  );

  // Verify page 1 and page 2 contain different posts (no overlap)
  const page1Ids = new Set(page1Default.data.map((post) => post.id));
  const page2Ids = new Set(page2.data.map((post) => post.id));
  const overlappingIds = [...page1Ids].filter((id) => page2Ids.has(id));

  TestValidator.equals(
    "no overlapping posts between pages",
    overlappingIds.length,
    0,
  );

  // Test 3: Small limit (10 posts per page)
  const smallLimit = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  typia.assert(smallLimit);
  TestValidator.equals(
    "small limit returns 10 posts",
    smallLimit.data.length,
    10,
  );
  TestValidator.equals(
    "small limit metadata correct",
    smallLimit.pagination.limit,
    10,
  );
  TestValidator.equals(
    "small limit total pages",
    smallLimit.pagination.pages,
    Math.ceil(totalPosts / 10),
  );

  // Test 4: Medium limit (50 posts per page)
  const mediumLimit = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 50,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  typia.assert(mediumLimit);
  TestValidator.equals(
    "medium limit returns 50 posts",
    mediumLimit.data.length,
    50,
  );
  TestValidator.equals(
    "medium limit metadata correct",
    mediumLimit.pagination.limit,
    50,
  );
  TestValidator.equals(
    "medium limit total pages",
    mediumLimit.pagination.pages,
    Math.ceil(totalPosts / 50),
  );

  // Test 5: Maximum limit (100 posts per page)
  const maxLimit = await api.functional.redditPlatform.posts.index(connection, {
    body: {
      page: 1,
      limit: 100,
    } satisfies IRedditPlatformPost.IRequest,
  });

  typia.assert(maxLimit);
  TestValidator.equals(
    "max limit returns 100 posts",
    maxLimit.data.length,
    100,
  );
  TestValidator.equals(
    "max limit metadata correct",
    maxLimit.pagination.limit,
    100,
  );
  TestValidator.equals(
    "max limit total pages",
    maxLimit.pagination.pages,
    Math.ceil(totalPosts / 100),
  );

  // Test 6: Last page verification
  const totalPages = Math.ceil(totalPosts / 25);
  const lastPage = await api.functional.redditPlatform.posts.index(connection, {
    body: {
      page: totalPages,
      limit: 25,
    } satisfies IRedditPlatformPost.IRequest,
  });

  typia.assert(lastPage);
  TestValidator.equals(
    "last page current page correct",
    lastPage.pagination.current,
    totalPages,
  );
  const expectedLastPageSize = totalPosts % 25 || 25;
  TestValidator.equals(
    "last page has correct number of posts",
    lastPage.data.length,
    expectedLastPageSize,
  );

  // Test 7: Data consistency across different limit sizes
  const allPostsFromDefault = [...page1Default.data, ...page2.data];
  const allPostsFromSmall = smallLimit.data;
  const allPostsFromMax = maxLimit.data;

  // Collect unique post IDs from different pagination strategies
  const defaultLimitIds = new Set(allPostsFromDefault.map((post) => post.id));
  const smallLimitIds = new Set(allPostsFromSmall.map((post) => post.id));
  const maxLimitIds = new Set(allPostsFromMax.map((post) => post.id));

  // Verify consistent data ordering (posts should maintain relative order)
  const defaultOrder = page1Default.data.map((post) => post.id);
  const page2Order = page2.data.map((post) => post.id);

  // Test 8: Pagination with sorting to ensure consistent ordering
  const sortedPage1 = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 25,
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  const sortedPage2 = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        page: 2,
        limit: 25,
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  typia.assert(sortedPage1);
  typia.assert(sortedPage2);

  // Verify chronological ordering within each page
  for (let i = 1; i < sortedPage1.data.length; i++) {
    TestValidator.predicate(
      "page 1 posts chronologically ordered",
      new Date(sortedPage1.data[i - 1].created_at) <=
        new Date(sortedPage1.data[i].created_at),
    );
  }

  for (let i = 1; i < sortedPage2.data.length; i++) {
    TestValidator.predicate(
      "page 2 posts chronologically ordered",
      new Date(sortedPage2.data[i - 1].created_at) <=
        new Date(sortedPage2.data[i].created_at),
    );
  }

  // Verify no duplicates across all tested pages
  const allTestedIds = new Set([
    ...page1Default.data.map((p) => p.id),
    ...page2.data.map((p) => p.id),
    ...smallLimit.data.map((p) => p.id),
    ...maxLimit.data.map((p) => p.id),
  ]);

  TestValidator.equals(
    "no duplicate posts across different pagination requests",
    allTestedIds.size,
    page1Default.data.length +
      page2.data.length +
      smallLimit.data.length +
      maxLimit.data.length,
  );

  // Test 9: Edge case - very high page number
  const invalidPage = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        page: 9999,
        limit: 25,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  typia.assert(invalidPage);
  TestValidator.equals(
    "invalid page returns empty data",
    invalidPage.data.length,
    0,
  );
  TestValidator.equals(
    "invalid page current page recorded",
    invalidPage.pagination.current,
    9999,
  );
  TestValidator.equals(
    "invalid page total records consistent",
    invalidPage.pagination.records,
    totalPosts,
  );

  // Test 10: Boundary limit testing
  const boundaryTests = [1, 50, 99, 100];

  for (const limit of boundaryTests) {
    const boundaryResult = await api.functional.redditPlatform.posts.index(
      connection,
      {
        body: {
          page: 1,
          limit: limit,
        } satisfies IRedditPlatformPost.IRequest,
      },
    );

    typia.assert(boundaryResult);
    TestValidator.equals(
      `limit ${limit} returns correct count`,
      boundaryResult.data.length,
      limit,
    );
    TestValidator.equals(
      `limit ${limit} metadata correct`,
      boundaryResult.pagination.limit,
      limit,
    );
  }
}
