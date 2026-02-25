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

export async function test_api_feed_views_audit_and_monitoring(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.redditClone.feed_views.index(adminConnection, {
    body: { page: 1, limit: 10 },
  });
  // 2. Test comprehensive feed view retrieval with filtering
  const result = await api.functional.redditClone.feed_views.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort_by: "last_refreshed_at",
        sort_order: "desc",
      },
    },
  );
  typia.assert(result);
  // 3. Validate pagination structure
  TestValidator.equals("pagination exists", result.pagination.current, 1);
  TestValidator.predicate("has records", result.data.length > 0);
  // 4. Validate feed view structure
  for (const view of result.data) {
    typia.assert(view);
    TestValidator.equals("feedConfig exists", !!view.feedConfig, true);
    TestValidator.predicate("has valid TTL", view.ttl_seconds >= 0);
    // 5. Test filtering by feed_config_id (if available)
    if (result.data.length > 0) {
      const feedConfigId = result.data[0].feed_config_id;
      const filteredResult = await api.functional.redditClone.feed_views.index(
        adminConnection,
        {
          body: {
            feed_config_id: feedConfigId,
            page: 1,
            limit: 10,
          },
        },
      );
      typia.assert(filteredResult);
      TestValidator.predicate(
        "filtered results match",
        filteredResult.data.every((v) => v.feed_config_id === feedConfigId),
      );
    }
    // 6. Test is_stale filter
    const staleResult = await api.functional.redditClone.feed_views.index(
      adminConnection,
      {
        body: {
          is_stale: true,
          page: 1,
          limit: 10,
        },
      },
    );
    typia.assert(staleResult);
    TestValidator.predicate(
      "stale filter works",
      staleResult.data.every((v) => v.is_stale === true),
    );
    // 7. Test cache_key filter
    if (result.data.length > 0) {
      const cacheKey = result.data[0].cache_key;
      const keyResult = await api.functional.redditClone.feed_views.index(
        adminConnection,
        {
          body: {
            cache_key: cacheKey,
            page: 1,
            limit: 10,
          },
        },
      );
      typia.assert(keyResult);
      TestValidator.equals(
        "cache_key filter",
        keyResult.data.length > 0 ? keyResult.data[0].cache_key : undefined,
        cacheKey,
      );
    }
    // 8. Validate timestamp formats
    if (view.last_refreshed_at) {
      TestValidator.predicate(
        "valid date-time format",
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
          view.last_refreshed_at,
        ),
      );
    }
  }
  // 9. Test pagination with limit
  const limitedResult = await api.functional.redditClone.feed_views.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 5,
      },
    },
  );
  typia.assert(limitedResult);
  TestValidator.predicate("respects limit", limitedResult.data.length <= 5);
  // 10. Test sorting validation
  const sortedResult = await api.functional.redditClone.feed_views.index(
    adminConnection,
    {
      body: {
        sort_by: "cache_key",
        sort_order: "asc",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(sortedResult);
  // 11. Test edge case: large page
  const edgeResult = await api.functional.redditClone.feed_views.index(
    adminConnection,
    {
      body: {
        page: 1000000,
        limit: 10,
      },
    },
  );
  typia.assert(edgeResult);
}
