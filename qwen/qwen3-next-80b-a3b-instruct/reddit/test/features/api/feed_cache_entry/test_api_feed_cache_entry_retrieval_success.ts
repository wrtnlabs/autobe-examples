import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityMvFeedCacheEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMvFeedCacheEntry";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_feed_cache_entry_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID for the cached feed entry
  const feedEntryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Retrieve the cached feed entry using the generated UUID
  const cachedEntry = await api.functional.community.feed_cache_entries.at(
    connection,
    { id: feedEntryId },
  );
  typia.assert(cachedEntry);
}
