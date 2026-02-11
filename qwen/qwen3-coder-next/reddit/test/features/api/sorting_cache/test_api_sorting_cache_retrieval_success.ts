import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformPostSortingCach } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSortingCach";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_sorting_cache_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for setup operations
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate a random cache key for testing
  const cacheKey = `hot:community:test123:page:1`;
  // Retrieve the sorting cache entry
  const cacheEntry = await api.functional.redditPlatform.sorting_caches.at(
    adminConnection,
    {
      cacheKey: cacheKey,
    },
  );
  typia.assert(cacheEntry);
  // Validate cache entry structure
  TestValidator.equals("cache key matches", cacheEntry.cache_key, cacheKey);
  TestValidator.predicate(
    "has valid cached_data",
    typeof cacheEntry.cached_data === "string",
  );
  TestValidator.predicate(
    "has valid expires_at",
    cacheEntry.expires_at !== undefined && cacheEntry.expires_at !== null,
  );
  TestValidator.predicate(
    "has valid sort_type",
    typeof cacheEntry.sort_type === "string",
  );
  TestValidator.predicate(
    "has valid page_number",
    typeof cacheEntry.page_number === "number",
  );
  TestValidator.predicate(
    "has valid page_size",
    typeof cacheEntry.page_size === "number",
  );
  TestValidator.predicate(
    "has valid created_at",
    typeof cacheEntry.created_at === "string",
  );
  // Verify optional fields
  if (
    cacheEntry.community_id !== undefined &&
    cacheEntry.community_id !== null
  ) {
    TestValidator.predicate(
      "community_id is valid uuid",
      /^[0-9a-f-]{36}$/i.test(cacheEntry.community_id),
    );
  }
  if (cacheEntry.time_range !== undefined && cacheEntry.time_range !== null) {
    TestValidator.predicate(
      "time_range is valid string",
      typeof cacheEntry.time_range === "string",
    );
  }
}
