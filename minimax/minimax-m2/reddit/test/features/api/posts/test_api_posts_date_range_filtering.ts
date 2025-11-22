import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/** <SCENARIO DESCRIPTION HERE> */
export async function test_api_posts_date_range_filtering(
  connection: api.IConnection,
) {
  // Step 1: Test basic date range filtering with recent timestamps
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Test recent posts filtering (last hour)
  const recentResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        created_after: oneHourAgo.toISOString(),
        sort_by: "created_at",
        sort_order: "desc",
        limit: 25,
      },
    },
  );
  typia.assert(recentResult);

  // Validate response structure
  TestValidator.equals(
    "recent result has pagination",
    recentResult.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "recent result has data array",
    Array.isArray(recentResult.data),
    true,
  );
  TestValidator.equals(
    "recent result limit matches request",
    recentResult.pagination.limit,
    25,
  );

  // Step 2: Test daily posts filtering (last 24 hours)
  const dailyResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        created_after: oneDayAgo.toISOString(),
        sort_by: "created_at",
        sort_order: "desc",
        limit: 50,
      },
    },
  );
  typia.assert(dailyResult);

  TestValidator.equals(
    "daily result has pagination",
    dailyResult.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "daily result has data array",
    Array.isArray(dailyResult.data),
    true,
  );
  TestValidator.equals(
    "daily result limit matches request",
    dailyResult.pagination.limit,
    50,
  );

  // Step 3: Test combination with status filter
  const statusFilteredResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        created_after: oneDayAgo.toISOString(),
        status: "active",
        sort_by: "created_at",
        sort_order: "desc",
      },
    },
  );
  typia.assert(statusFilteredResult);

  TestValidator.equals(
    "status filtered has valid structure",
    statusFilteredResult.data !== undefined &&
      Array.isArray(statusFilteredResult.data),
    true,
  );

  // Step 4: Test combination with content type filter
  const contentFilteredResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        created_after: oneDayAgo.toISOString(),
        content_type: "text",
        sort_by: "created_at",
        sort_order: "desc",
      },
    },
  );
  typia.assert(contentFilteredResult);

  TestValidator.equals(
    "content filtered has valid structure",
    contentFilteredResult.data !== undefined &&
      Array.isArray(contentFilteredResult.data),
    true,
  );

  // Step 5: Test date range with both created_after and created_before
  const rangeResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        created_after: oneWeekAgo.toISOString(),
        created_before: now.toISOString(),
        sort_by: "created_at",
        sort_order: "asc",
        limit: 25,
      },
    },
  );
  typia.assert(rangeResult);

  TestValidator.equals(
    "range result has valid structure",
    rangeResult.data !== undefined && Array.isArray(rangeResult.data),
    true,
  );
  TestValidator.equals(
    "range result limit matches request",
    rangeResult.pagination.limit,
    25,
  );

  // Step 6: Test boundary dates - specific time ranges
  const boundaryStart = new Date(oneDayAgo.getTime());
  const boundaryEnd = new Date(oneHourAgo.getTime());

  const boundaryResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        created_after: boundaryStart.toISOString(),
        created_before: boundaryEnd.toISOString(),
        sort_by: "created_at",
        sort_order: "asc",
      },
    },
  );
  typia.assert(boundaryResult);

  TestValidator.equals(
    "boundary result has valid structure",
    boundaryResult.data !== undefined && Array.isArray(boundaryResult.data),
    true,
  );

  // Step 7: Test invalid date format handling
  await TestValidator.error(
    "API should reject invalid created_after format",
    async () => {
      await api.functional.redditPlatform.posts.index(connection, {
        body: {
          created_after: "invalid-date-format",
          sort_by: "created_at",
        },
      });
    },
  );

  // Test invalid created_before format
  await TestValidator.error(
    "API should reject invalid created_before format",
    async () => {
      await api.functional.redditPlatform.posts.index(connection, {
        body: {
          created_before: "not-a-date",
          sort_by: "created_at",
        },
      });
    },
  );

  // Step 8: Test wide date range covering extended period
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const wideRangeResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        created_after: oneMonthAgo.toISOString(),
        sort_by: "created_at",
        sort_order: "desc",
        limit: 100,
      },
    },
  );
  typia.assert(wideRangeResult);

  TestValidator.equals(
    "wide range result has valid structure",
    wideRangeResult.data !== undefined && Array.isArray(wideRangeResult.data),
    true,
  );
  TestValidator.equals(
    "wide range limit matches request",
    wideRangeResult.pagination.limit,
    100,
  );

  // Step 9: Test future date range (should return empty or minimal results)
  const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const futureResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        created_after: futureDate.toISOString(),
        sort_by: "created_at",
        limit: 25,
      },
    },
  );
  typia.assert(futureResult);

  // Validate pagination structure even with empty results
  TestValidator.equals(
    "future result has pagination",
    futureResult.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "future result is array",
    Array.isArray(futureResult.data),
    true,
  );

  // Step 10: Test date format compliance in responses
  if (recentResult.data.length > 0) {
    for (const post of recentResult.data) {
      // Validate ISO 8601 date-time format
      TestValidator.predicate(
        "post created_at is valid ISO format",
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(post.created_at),
      );

      // Validate required fields are present
      TestValidator.equals("post has id", post.id !== undefined, true);
      TestValidator.equals("post has title", post.title !== undefined, true);
      TestValidator.equals("post has author", post.author !== undefined, true);
      TestValidator.equals(
        "post has community",
        post.community !== undefined,
        true,
      );
    }
  }

  // Step 11: Test pagination with date filtering
  const paginatedResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        created_after: oneDayAgo.toISOString(),
        page: 1,
        limit: 10,
        sort_by: "created_at",
        sort_order: "desc",
      },
    },
  );
  typia.assert(paginatedResult);

  TestValidator.equals(
    "paginated result has correct page",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "paginated result has correct limit",
    paginatedResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "paginated result has valid structure",
    paginatedResult.data !== undefined && Array.isArray(paginatedResult.data),
    true,
  );

  // Step 12: Test different date format variations
  const exactDateResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        created_after: now.toISOString(),
        created_before: now.toISOString(),
        sort_by: "created_at",
      },
    },
  );
  typia.assert(exactDateResult);

  TestValidator.equals(
    "exact date result has valid structure",
    exactDateResult.data !== undefined && Array.isArray(exactDateResult.data),
    true,
  );
}
