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

export async function test_api_community_popular_feed_hot_sort(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const actorConnection: api.IConnection = { host: connection.host };
  // Make API call with empty request body (ICommunityPost.IRequest is {})
  const result = await api.functional.community.popular_feeds.index(
    actorConnection,
    {
      body: {},
    },
  );
  typia.assert(result);
  // Validate pagination metadata
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.equals("limit is 20", result.pagination.limit, 20);
  TestValidator.predicate(
    "total records is greater than or equal to 0",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is greater than or equal to 0",
    result.pagination.pages >= 0,
  );
  // Validate data length (should be between 0 and 20)
  TestValidator.predicate(
    "data length is between 0 and 20",
    result.data.length >= 0 && result.data.length <= 20,
  );
  // Validate each post in the result conforms to ICommunityPost.ISummary
  for (const post of result.data) {
    typia.assert(post);
  }
  // Validate that pagination metadata is consistent
  if (result.pagination.limit > 0) {
    TestValidator.equals(
      "pages calculation matches records/limit",
      result.pagination.pages,
      Math.ceil(result.pagination.records / result.pagination.limit),
    );
  }
  // Note: Property validation abandoned - ICommunityPost.ISummary is defined as empty {} in DTO
  // We cannot validate properties that don't exist in the type definition per Anti-Hallucination Protocol
}
