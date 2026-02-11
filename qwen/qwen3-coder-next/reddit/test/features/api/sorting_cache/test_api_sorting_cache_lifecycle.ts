import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformPostSortingCach } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSortingCach";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_sorting_cache_lifecycle(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate a random cache key for testing
  const cacheKey = `test:hot:community:${RandomGenerator.alphaNumeric(8)}:page:1`;
  // Retrieve the sorting cache entry
  const cacheEntry = await api.functional.redditPlatform.sorting_caches.at(
    adminConnection,
    {
      cacheKey: cacheKey,
    },
  );
  // Validate the cache entry structure
  typia.assert(cacheEntry);
  // Verify cache entry properties
  TestValidator.equals("cache_key matches", cacheEntry.cache_key, cacheKey);
  TestValidator.predicate("cached_data is valid JSON string", () => {
    try {
      const parsed = JSON.parse(cacheEntry.cached_data);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return false;
    }
  });
  // Verify metadata properties
  TestValidator.predicate("sort_type is defined", () => !!cacheEntry.sort_type);
  TestValidator.predicate(
    "page_number is valid",
    () => cacheEntry.page_number > 0,
  );
  TestValidator.predicate("page_size is valid", () => cacheEntry.page_size > 0);
  // Verify timestamp properties
  TestValidator.predicate(
    "expires_at is in the future",
    () => new Date(cacheEntry.expires_at) > new Date(),
  );
  TestValidator.predicate("created_at exists", () => !!cacheEntry.created_at);
  // Test cache entry with pagination parameters
  TestValidator.predicate(
    "has reasonable page_size",
    () => cacheEntry.page_size > 0 && cacheEntry.page_size <= 100,
  );
  // Verify sorting algorithm parameters
  TestValidator.predicate("sort_type is one of expected values", () =>
    ["hot", "top", "new", "controversial"].includes(cacheEntry.sort_type),
  );
  // Verify optional properties
  TestValidator.predicate(
    "time_range is valid",
    () =>
      cacheEntry.time_range === null ||
      cacheEntry.time_range === undefined ||
      ["hour", "day", "week", "month", "year", "all_time"].includes(
        cacheEntry.time_range,
      ),
  );
  // Verify data structure integrity
  const cachedDataArray = JSON.parse(cacheEntry.cached_data) as Array<{
    id: string;
    score: number;
    timestamp: string;
  }>;
  TestValidator.predicate(
    "cached_data has posts",
    () => cachedDataArray.length > 0,
  );
  TestValidator.predicate("all posts have valid IDs", () =>
    cachedDataArray.every(
      (post) => /^[0-9a-f-]{36}$/i.test(post.id) || post.id.length > 0,
    ),
  );
  TestValidator.predicate("all posts have scores", () =>
    cachedDataArray.every(
      (post) => typeof post.score === "number" && post.score >= 0,
    ),
  );
}
