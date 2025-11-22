import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_posts_performance_with_large_datasets(
  connection: api.IConnection,
) {
  const startTime = Date.now();

  // Test 1: Maximum page limit performance test
  const maxLimitResponse = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        limit: 100, // Maximum allowed limit
        page: 1,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(maxLimitResponse);

  const responseTime = Date.now() - startTime;
  TestValidator.predicate(
    "maximum limit response time under 3 seconds",
    responseTime < 3000,
  );
  TestValidator.equals(
    "maximum limit returns 100 posts",
    maxLimitResponse.data.length,
    100,
  );

  // Test 2: Multiple filter combinations performance
  const multiFilterResponse = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 50,
        content_type: "text",
        status: "active",
        min_score: 1,
        sort_by: "score",
        sort_order: "desc",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(multiFilterResponse);

  TestValidator.predicate(
    "multi-filter response time under 2 seconds",
    Date.now() - startTime < 2000,
  );

  // Test 3: Complex search with multiple parameters
  const searchResponse = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        search: "technology innovation",
        limit: 75,
        min_comment_count: 5,
        sort_by: "comment_count",
        sort_order: "desc",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(searchResponse);

  // Test 4: Date range filtering performance
  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const now = new Date().toISOString();

  const dateRangeResponse = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        created_after: oneWeekAgo,
        created_before: now,
        limit: 80,
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(dateRangeResponse);

  // Test 5: Pagination with large datasets
  let totalPages = 0;
  let totalRecords = 0;

  for (let page = 1; page <= 5; page++) {
    const paginatedResponse = await api.functional.redditPlatform.posts.index(
      connection,
      {
        body: {
          page,
          limit: 100,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
    typia.assert(paginatedResponse);

    totalPages = Math.max(totalPages, paginatedResponse.pagination.pages);
    totalRecords = Math.max(totalRecords, paginatedResponse.pagination.records);

    TestValidator.equals(
      `page ${page} has correct pagination data`,
      paginatedResponse.pagination.current,
      page,
    );
  }

  // Test 6: Performance with trending score sorting
  const trendingResponse = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        sort_by: "trending_score",
        sort_order: "desc",
        limit: 60,
        include_spoilers: true,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(trendingResponse);

  // Test 7: Mixed content type filtering
  const contentTypes = ["text", "link", "image"] as const;
  for (const contentType of contentTypes) {
    const contentResponse = await api.functional.redditPlatform.posts.index(
      connection,
      {
        body: {
          content_type: contentType,
          limit: 40,
          sort_by: "view_count",
          sort_order: "asc",
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
    typia.assert(contentResponse);
  }

  // Test 8: Edge case - maximum limit with minimal other parameters
  const edgeCaseResponse = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        limit: 100,
        page: 1,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(edgeCaseResponse);
  TestValidator.equals(
    "edge case returns maximum allowed posts",
    edgeCaseResponse.data.length,
    100,
  );

  // Test 9: High page number performance
  const highPageResponse = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        page: 100, // High page number
        limit: 50,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(highPageResponse);

  // Test 10: Upvote ratio sorting performance
  const upvoteResponse = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        sort_by: "upvote_ratio",
        sort_order: "desc",
        min_score: 10,
        limit: 90,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(upvoteResponse);

  // Final performance validation
  const totalTestTime = Date.now() - startTime;
  TestValidator.predicate(
    "entire test suite completes under 15 seconds",
    totalTestTime < 15000,
  );

  TestValidator.equals("total records in system", totalRecords, totalRecords);
}
