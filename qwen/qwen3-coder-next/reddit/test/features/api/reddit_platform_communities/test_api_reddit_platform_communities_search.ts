import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_reddit_platform_communities_search(
  connection: api.IConnection,
): Promise<void> {
  // Test search endpoint with empty body returns valid ISummary structure
  const searchResult =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: {},
    });
  typia.assert(searchResult);
  // Verify pagination structure exists and has correct types
  TestValidator.equals(
    "has current page",
    typeof searchResult.pagination.current,
    "number",
  );
  TestValidator.equals(
    "has limit",
    typeof searchResult.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "has records count",
    typeof searchResult.pagination.records,
    "number",
  );
  TestValidator.equals(
    "has pages count",
    typeof searchResult.pagination.pages,
    "number",
  );
  // Verify data array exists
  TestValidator.equals(
    "data array exists",
    Array.isArray(searchResult.data),
    true,
  );
}
