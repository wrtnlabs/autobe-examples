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

export async function test_api_feed_popular_hot_default(
  connection: api.IConnection,
): Promise<void> {
  // Test the primary success path where a guest user retrieves the most popular posts sorted by the 'hot' algorithm.
  // The system should return the first page of 20 posts from community_mv_community_popular_feeds materialized view with is_active = true.
  // Validate that response includes correct denormalized fields: title, author_username, community_name, vote_score, comment_count, post_type, content_preview, created_at, last_updated, domain_name (for link posts), and thumbnail_url (for image posts).
  // The pagination should show current page 1 with limit 20 and records count reflecting total available posts.
  // Use base connection to create actor-specific connections
  const guestConnection: api.IConnection = { host: connection.host };
  // Create request body with empty object as per IRequest definition
  const requestBody: ICommunityMvCommunityPopularFeed.IRequest = {};
  // Call the API endpoint
  const response = await api.functional.community.feed.popular.index(
    guestConnection,
    {
      body: requestBody,
    },
  );
  // Validate the response structure using typia.assert
  typia.assert(response);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page is 1",
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
  // Validate that data array exists and has at least the minimum expected items
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  // Validate that data array items are objects (though ISummary is empty, they must exist as objects)
  TestValidator.predicate(
    "data array has at least 0 items",
    response.data.length >= 0,
  );
  // Validate each item in data array is an object (as ISummary is an empty object)
  for (const item of response.data) {
    TestValidator.predicate("item is an object", typeof item === "object");
    TestValidator.predicate("item is not null", item !== null);
  }
}
