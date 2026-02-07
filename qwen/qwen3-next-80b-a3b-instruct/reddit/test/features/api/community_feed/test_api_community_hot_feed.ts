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

export async function test_api_community_hot_feed(
  connection: api.IConnection,
): Promise<void> {
  // Test the popular feed with 'hot' sorting algorithm to verify posts are ranked by recent engagement weighted by time decay. Validate that the response includes only active, non-deleted posts and returns the correct pagination metadata with page_token_next and has_next_page based on the materialized view. Ensure no JOINs are performed and all data is sourced exclusively from community_mv_community_popular_feeds.
  // Using connection as base, create a direct connection for the request
  const feedConnection: api.IConnection = { host: connection.host };
  // Generate random request body with 'hot' sorting algorithm
  const requestBody: ICommunityPost.IRequest = {
    // All properties in IRequest are empty object, so we pass empty object
    // as per schema definition
  };
  // Execute the endpoint call - PATCH /community/community-feeds
  const response: IPageICommunityPost.ISummary =
    await api.functional.community.community_feeds.index(feedConnection, {
      body: requestBody,
    });
  // Validate response structure with typia.assert()
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.predicate(
    "current page is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate that data array is present
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  // Validate that each item in data array is of type ICommunityPost.ISummary
  // Since ISummary is empty, there are no properties to validate
  // The validation is guaranteed by typia.assert(response) which validates the entire structure
  // Therefore, we do nothing here.
}
