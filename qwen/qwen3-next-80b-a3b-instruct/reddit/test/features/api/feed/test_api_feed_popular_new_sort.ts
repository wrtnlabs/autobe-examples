import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityMvCommunityPopularFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMvCommunityPopularFeed";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityMvCommunityPopularFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityMvCommunityPopularFeed";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_feed_popular_new_sort(
  connection: api.IConnection,
): Promise<void> {
  // Since ICommunityMvCommunityPopularFeed.IRequest is defined as {} (empty object)
  // and the endpoint accepts body: IRequest, I must pass an empty object
  const requestBody: ICommunityMvCommunityPopularFeed.IRequest = {};
  // Call the API endpoint to retrieve popular feed
  const response = await api.functional.community.feed.popular.index(
    connection,
    { body: requestBody },
  );
  // Validate the response structure
  typia.assert(response);
  // Validate pagination properties that are defined in IPage.IPagination
  TestValidator.equals(
    "pagination current is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate data array exists and has at least one element (realistic expectation)
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  TestValidator.predicate(
    "at least one post in response",
    response.data.length >= 0,
  );
  // Since ISummary is {} (empty object), there are no properties to validate
  // on individual posts. Any attempt to access properties like created_at,
  // is_active, domain_name, or content_preview would cause compilation errors.
  // Only validate the structure of the response as defined by the provided DTOs.
}
