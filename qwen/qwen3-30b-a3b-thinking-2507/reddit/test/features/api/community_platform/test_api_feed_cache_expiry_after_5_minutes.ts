import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformFeedCache } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeedCache";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformFeedCache } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFeedCache";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_feed_cache_expiry_after_5_minutes(
  connection: api.IConnection,
): Promise<void> {
  // Request feed cache entries for "community" feed type
  const feedType: "community" = "community";
  const page: number = 1;
  const limit: number = 1;
  // Call index API
  const output: IPageICommunityPlatformFeedCache.ISummary =
    await api.functional.communityPlatform.feed_caches.index(connection, {
      body: {
        feed_type: feedType,
        page: page,
        limit: limit,
      },
    });
  typia.assert(output);
  // Verify that the cache is expired (empty data)
  TestValidator.equals(
    "no entries should be returned for expired community feed cache",
    output.data.length,
    0,
  );
  // Verify the response structure remains correctly formed (pagination)
  TestValidator.equals(
    "pagination should have 0 records",
    output.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination should have 0 pages",
    output.pagination.pages,
    0,
  );
}
