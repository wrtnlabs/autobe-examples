import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityMvFeedCacheEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMvFeedCacheEntry";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_feed_cache_entry_payload_integrity(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID for the cache entry ID
  const cacheId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the cache entry from the API
  const cacheEntry = await api.functional.community.feed_cache_entries.at(
    connection,
    {
      id: cacheId,
    },
  );
  // Validate the response adheres to the ICommunityMvFeedCacheEntry type (empty object)
  typia.assert(cacheEntry);
}
