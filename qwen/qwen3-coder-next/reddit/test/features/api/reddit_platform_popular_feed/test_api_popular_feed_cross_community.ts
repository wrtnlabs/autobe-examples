import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_popular_feed_cross_community(
  connection: api.IConnection,
): Promise<void> {
  // Create public connection (no authentication) for testing public popular feed
  const publicConnection: api.IConnection = { host: connection.host };
  // Get popular feed - this should work without authentication
  const popularFeed =
    await api.functional.redditPlatform.popular.index(publicConnection);
  typia.assert(popularFeed);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    popularFeed.pagination !== null && popularFeed.pagination !== undefined,
  );
  TestValidator.predicate("has valid limit", popularFeed.pagination.limit > 0);
  TestValidator.predicate(
    "has valid current page",
    popularFeed.pagination.current >= 1,
  );
  TestValidator.predicate(
    "has valid records count",
    popularFeed.pagination.records >= 0,
  );
  // Validate that data array structure is correct
  TestValidator.predicate(
    "data array exists",
    popularFeed.data !== null && popularFeed.data !== undefined,
  );
  // If there are posts, verify their structure
  if (popularFeed.data.length > 0) {
    TestValidator.predicate("first post exists", popularFeed.data[0] !== null);
  }
}
