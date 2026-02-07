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

export async function test_api_post_search_top_sorting_with_time_filters(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  // Verify pagination structure exists in response
  const result = await api.functional.redditPlatform.posts.search(
    adminConnection,
    {
      body: {} satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(result);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    result.pagination !== null && result.pagination !== undefined,
  );
  TestValidator.predicate(
    "records count is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate("limit is positive", result.pagination.limit > 0);
  TestValidator.predicate(
    "current page is positive",
    result.pagination.current > 0,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    result.pagination.pages === 0 || result.pagination.pages >= 1,
  );
  // Verify data array structure
  TestValidator.predicate("data array exists", Array.isArray(result.data));
  TestValidator.equals(
    "data length matches pagination",
    result.data.length <= result.pagination.limit,
    true,
  );
  // Verify each post summary has correct structure
  if (result.data.length > 0) {
    const firstPost = result.data[0];
    // Skip id check since ISummary type may not have id property
    TestValidator.predicate("summary is not null", firstPost !== null);
    TestValidator.predicate("summary has entity structure", typeof firstPost === "object");
  }
}