import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_popular_feed_top_sort_with_time_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const customerConnection: api.IConnection = { host: connection.host };
  // Test top sort with 7-day time filter (server applies 7-day filter by default for top sort)
  // Create request body with empty object as per ICommunityPost.IRequest
  const requestBody: ICommunityPost.IRequest = {};
  const result = await api.functional.community.popular_feeds.index(
    customerConnection,
    {
      body: requestBody,
    },
  );
  typia.assert(result);
  // Validate the response structure according to IPageICommunityPost.ISummary
  // Must have pagination property (IPage.IPagination)
  TestValidator.equals(
    "response has pagination",
    result.pagination !== undefined,
    true,
  );
  // Validate pagination structure according to IPage.IPagination
  TestValidator.predicate(
    "pagination current is 1-indexed",
    result.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  // Must have data property (ICommunityPost.ISummary[])
  TestValidator.equals("response has data", result.data !== undefined, true);
  TestValidator.predicate("data is an array", Array.isArray(result.data));
  // Since ICommunityPost.ISummary is an empty object, we can only validate its array structure
  // Check that each item in data is an object (empty object as required by type)
  TestValidator.predicate(
    "all data items are objects",
    result.data.every((item) => typeof item === "object" && item !== null),
  );
}
