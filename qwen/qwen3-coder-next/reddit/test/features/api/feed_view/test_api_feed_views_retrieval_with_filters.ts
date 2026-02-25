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

export async function test_api_feed_views_retrieval_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for setup operations
  const adminConnection: api.IConnection = { host: connection.host };
  // TODO: Setup admin authentication and create test data if needed
  // For now, testing retrieval functionality directly
  // Test 1: Basic retrieval with default pagination
  const allViews = await api.functional.redditClone.feed_views.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(allViews);
  TestValidator.equals("has data array", Array.isArray(allViews.data), true);
  TestValidator.equals(
    "has pagination",
    allViews.pagination !== undefined,
    true,
  );
  // Test 2: Filter by feed_config_id
  const configId = "123e4567-e89b-12d3-a456-426614174000";
  const byConfig = await api.functional.redditClone.feed_views.index(
    adminConnection,
    {
      body: {
        feed_config_id: configId,
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(byConfig);
  // Test 3: Filter by cache_key
  const cacheKey = "home_hot_today";
  const byCacheKey = await api.functional.redditClone.feed_views.index(
    adminConnection,
    {
      body: {
        cache_key: cacheKey,
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(byCacheKey);
  // Test 4: Filter by is_stale status
  const staleViews = await api.functional.redditClone.feed_views.index(
    adminConnection,
    {
      body: {
        is_stale: true,
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(staleViews);
  // Test 5: Sort by created_at ascending
  const sortedAsc = await api.functional.redditClone.feed_views.index(
    adminConnection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(sortedAsc);
  // Test 6: Sort by cache_key descending
  const sortedDesc = await api.functional.redditClone.feed_views.index(
    adminConnection,
    {
      body: {
        sort_by: "cache_key",
        sort_order: "desc",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(sortedDesc);
  // Test 7: Combined filters and sorting
  const combined = await api.functional.redditClone.feed_views.index(
    adminConnection,
    {
      body: {
        feed_config_id: configId,
        cache_key: cacheKey,
        is_stale: false,
        sort_by: "updated_at",
        sort_order: "desc",
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(combined);
  // Test 8: Pagination validation
  const firstPage = await api.functional.redditClone.feed_views.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 5,
      },
    },
  );
  typia.assert(firstPage);
  const secondPage = await api.functional.redditClone.feed_views.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 5,
      },
    },
  );
  typia.assert(secondPage);
  // Test 9: Boundary pagination values
  const minLimit = await api.functional.redditClone.feed_views.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 1,
      },
    },
  );
  typia.assert(minLimit);
  const maxLimit = await api.functional.redditClone.feed_views.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
      },
    },
  );
  typia.assert(maxLimit);
  // Test 10: Empty result handling
  const emptyFilter = await api.functional.redditClone.feed_views.index(
    adminConnection,
    {
      body: {
        cache_key: "nonexistent_key_" + RandomGenerator.alphaNumeric(20),
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(emptyFilter);
  TestValidator.predicate(
    "empty result when filter matches nothing",
    emptyFilter.data.length === 0,
  );
}
