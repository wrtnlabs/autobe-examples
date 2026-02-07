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

export async function test_api_controversial_feed_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test basic feed retrieval
  const basicFeed =
    await api.functional.redditPlatform.controversial.index(connection);
  typia.assert(basicFeed);
  // Verify pagination structure exists
  TestValidator.predicate(
    "pagination exists",
    basicFeed.pagination !== undefined,
  );
  TestValidator.predicate("data array exists", basicFeed.data !== undefined);
  // Test pagination metadata validation
  TestValidator.predicate(
    "current page positive",
    basicFeed.pagination.current > 0,
  );
  TestValidator.predicate("limit positive", basicFeed.pagination.limit > 0);
  TestValidator.predicate(
    "records non-negative",
    basicFeed.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages non-negative",
    basicFeed.pagination.pages >= 0,
  );
  // Verify pages calculation is correct
  TestValidator.predicate(
    "pages calculation correct",
    basicFeed.pagination.records > 0
      ? basicFeed.pagination.pages ===
          Math.ceil(basicFeed.pagination.records / basicFeed.pagination.limit)
      : basicFeed.pagination.pages === 0,
  );
  // Verify data array length matches or is less than limit
  TestValidator.predicate(
    "data length respects limit",
    basicFeed.data.length <= basicFeed.pagination.limit,
  );
  // Test that all posts in the feed are valid summaries
  for (const post of basicFeed.data) {
    typia.assert<IRedditPlatformPost.ISummary>(post);
  }
}
