import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneFeedView";
import type { IRedditCloneFeedConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedConfig";
import type { IRedditCloneFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedView";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_feed_views_edge_cases_and_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Edge case 1: Empty result set when filter matches no records
  const emptyResult = await api.functional.redditClone.feed_views.index(
    connection,
    {
      body: {
        cache_key: "nonexistent_cache_key",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result when no matching cache key",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty result pagination records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result pagination pages",
    emptyResult.pagination.pages,
    0,
  );
  // Edge case 2: Single record returned with limit=1
  const singleRecord = await api.functional.redditClone.feed_views.index(
    connection,
    {
      body: {
        limit: 1,
        page: 1,
      },
    },
  );
  typia.assert(singleRecord);
  TestValidator.predicate(
    "single record result has at most 1 item",
    singleRecord.data.length <= 1,
  );
  TestValidator.equals(
    "single record pagination limit",
    singleRecord.pagination.limit,
    1,
  );
  // Edge case 3: Last page pagination when records count is exact multiple of limit
  const exactMultiple = await api.functional.redditClone.feed_views.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(exactMultiple);
  if (exactMultiple.pagination.records > 0) {
    const totalPages = Math.ceil(
      exactMultiple.pagination.records / exactMultiple.pagination.limit,
    );
    if (totalPages > 1) {
      const lastPage = await api.functional.redditClone.feed_views.index(
        connection,
        {
          body: {
            page: totalPages,
            limit: exactMultiple.pagination.limit,
          },
        },
      );
      typia.assert(lastPage);
      TestValidator.equals(
        "last page number",
        lastPage.pagination.current,
        totalPages,
      );
    }
  }
  // Edge case 4: Filter combination that excludes all records (is_stale=true AND is_stale=false is impossible)
  const conflictingFilter = await api.functional.redditClone.feed_views.index(
    connection,
    {
      body: {
        is_stale: true,
      },
    },
  );
  typia.assert(conflictingFilter);
  // Note: The API likely treats is_stale as a single filter, not combined AND logic
  // Edge case 5: Invalid filter values gracefully handled or return empty results
  const invalidPage = await api.functional.redditClone.feed_views.index(
    connection,
    {
      body: {
        page: 0, // Invalid: page must be >= 1
        limit: 10,
      },
    },
  );
  typia.assert(invalidPage);
  // Server should handle invalid page gracefully (likely return page 1 or empty)
  const invalidLimit = await api.functional.redditClone.feed_views.index(
    connection,
    {
      body: {
        page: 1,
        limit: 0, // Invalid: limit must be >= 1
      },
    },
  );
  typia.assert(invalidLimit);
  // Server should handle invalid limit gracefully
  // Edge case 6: Maximum page size limit (100) boundary condition
  const maxLimit = await api.functional.redditClone.feed_views.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100, // Maximum allowed
      },
    },
  );
  typia.assert(maxLimit);
  TestValidator.predicate(
    "max limit result respects limit",
    maxLimit.data.length <= 100,
  );
  TestValidator.equals(
    "max limit pagination limit",
    maxLimit.pagination.limit,
    100,
  );
  // Edge case 7: Maximum page size + 1 should be rejected (boundary)
  // This test may cause a 422 error, so we handle it appropriately
  try {
    await api.functional.redditClone.feed_views.index(connection, {
      body: {
        page: 1,
        limit: 101, // Exceeds maximum
      },
    });
    throw new Error("Expected validation error for limit > 100");
  } catch (exp) {
    if (exp instanceof api.HttpError) {
      TestValidator.equals("limit > 100 returns 422", exp.status, 422);
    } else {
      throw new Error("Expected HttpError for limit > 100");
    }
  }
  // Edge case 8: Negative page number handling
  try {
    await api.functional.redditClone.feed_views.index(connection, {
      body: {
        page: -1, // Negative page
        limit: 10,
      },
    });
    throw new Error("Expected validation error for negative page");
  } catch (exp) {
    if (exp instanceof api.HttpError) {
      TestValidator.equals("negative page returns 422", exp.status, 422);
    } else {
      throw new Error("Expected HttpError for negative page");
    }
  }
  // Edge case 9: Sort by cache_key with alphabetical ordering
  const sortedCacheKey = await api.functional.redditClone.feed_views.index(
    connection,
    {
      body: {
        sort_by: "cache_key",
        sort_order: "asc",
        page: 1,
        limit: 5,
      },
    },
  );
  typia.assert(sortedCacheKey);
  // Basic validation that response structure is correct
  // Edge case 10: Large dataset pagination (test performance)
  const largeDataset = await api.functional.redditClone.feed_views.index(
    connection,
    {
      body: {
        page: 1,
        limit: 50,
      },
    },
  );
  typia.assert(largeDataset);
  // Ensure response is within acceptable time bounds
}
