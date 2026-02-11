import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformPopularFeedCach } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPopularFeedCach";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_popular_feed_cache_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Test platform-wide popular feed with hot sort method
  const hotCache =
    await api.functional.redditPlatform.popular_cache.index(connection);
  typia.assert(hotCache);
  TestValidator.equals("feed_type is popular", hotCache.feed_type, "popular");
  TestValidator.predicate("has valid id", /^[0-9a-f-]{36}$/i.test(hotCache.id));
  TestValidator.predicate("has valid cache_data JSON", () => {
    try {
      JSON.parse(hotCache.cache_data);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.equals("sort_method is hot", hotCache.sort_method, "hot");
  TestValidator.equals(
    "time_filter is null for platform-wide",
    hotCache.time_filter,
    null,
  );
  TestValidator.equals(
    "community_id is null for platform-wide",
    hotCache.community_id,
    null,
  );
  TestValidator.predicate("has valid version", hotCache.version > 0);
  TestValidator.predicate(
    "has valid expires_at timestamp",
    () => !isNaN(new Date(hotCache.expires_at).getTime()),
  );
  TestValidator.predicate(
    "has valid created_at timestamp",
    () => !isNaN(new Date(hotCache.created_at).getTime()),
  );
  TestValidator.predicate(
    "has valid updated_at timestamp",
    () => !isNaN(new Date(hotCache.updated_at).getTime()),
  );
  // Test with different sort methods
  const newCache =
    await api.functional.redditPlatform.popular_cache.index(connection);
  typia.assert(newCache);
  TestValidator.equals("new sort_method is new", newCache.sort_method, "new");
  const topCache =
    await api.functional.redditPlatform.popular_cache.index(connection);
  typia.assert(topCache);
  TestValidator.equals("top sort_method is top", topCache.sort_method, "top");
  const controversialCache =
    await api.functional.redditPlatform.popular_cache.index(connection);
  typia.assert(controversialCache);
  TestValidator.equals(
    "controversial sort_method is controversial",
    controversialCache.sort_method,
    "controversial",
  );
}
