import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPostSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPostSummary";
import type { IRedditPlatformPostSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_reddit_platform_hot_feed_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Retrieve hot feed
  const response = await api.functional.redditPlatform.hot.index(connection);
  typia.assert(response);
  // Validate pagination structure
  TestValidator.equals("has pagination object", response.pagination.current, 1);
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.equals(
    "pages calculation correct",
    response.pagination.pages,
    response.pagination.limit > 0
      ? Math.ceil(response.pagination.records / response.pagination.limit)
      : 0,
  );
  // Validate data structure
  if (response.data.length > 0) {
    // Check first post exists and is an object
    TestValidator.predicate(
      "first post exists",
      typeof response.data[0] === "object" && response.data[0] !== null,
    );
  }
}
