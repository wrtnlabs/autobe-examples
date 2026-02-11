import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformPopularFeedCach } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPopularFeedCach";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_popular_feed_cache_versioning(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Fetch popular feed cache with default parameters
  const cache =
    await api.functional.redditPlatform.popular_cache.index(connection);
  typia.assert(cache);
  // Validate required fields
  TestValidator.equals("feed_type is popular", cache.feed_type, "popular");
  TestValidator.predicate(
    "version is non-negative integer",
    cache.version >= 0,
  );
  TestValidator.predicate("has valid UUID", /^[0-9a-f-]{36}$/i.test(cache.id));
  // Test 2: Verify cache data structure
  const cacheData = JSON.parse(cache.cache_data);
  TestValidator.predicate(
    "cache_data is valid structure",
    typeof cacheData === "object" && cacheData !== null,
  );
  // Test 3: Test cache version consistency across calls
  const secondCache =
    await api.functional.redditPlatform.popular_cache.index(connection);
  typia.assert(secondCache);
  TestValidator.equals(
    "version consistent across calls",
    secondCache.version,
    cache.version,
  );
  // Test 4: Validate timestamp fields
  TestValidator.predicate(
    "has created_at",
    cache.created_at !== undefined && cache.created_at !== null,
  );
  TestValidator.predicate(
    "has updated_at",
    cache.updated_at !== undefined && cache.updated_at !== null,
  );
  TestValidator.predicate(
    "has expires_at",
    cache.expires_at !== undefined && cache.expires_at !== null,
  );
  // Test 5: Verify timestamp formats are valid ISO strings
  TestValidator.predicate(
    "created_at is ISO format",
    !isNaN(new Date(cache.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is ISO format",
    !isNaN(new Date(cache.updated_at).getTime()),
  );
  TestValidator.predicate(
    "expires_at is ISO format",
    !isNaN(new Date(cache.expires_at).getTime()),
  );
  // Test 6: Validate cache_data contains expected structure for popular feed
  TestValidator.predicate(
    "cache_data has content",
    Array.isArray(cacheData) ||
      (typeof cacheData === "object" && Object.keys(cacheData).length > 0),
  );
}
