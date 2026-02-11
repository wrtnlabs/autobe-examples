import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_popular_feed_controversial_week(
  connection: api.IConnection,
): Promise<void> {
  // Create request body with popular feed, controversial sorting, and week time filter
  const requestBody: IRedditCommunityPost.IRequest = {
    feedType: "popular",
    sortBy: "controversial",
    timeFilter: "week",
    page: 1,
    limit: 20,
  } satisfies IRedditCommunityPost.IRequest;
  // Call the API endpoint with the request body
  const result = await api.functional.redditCommunity.posts.index(connection, {
    body: requestBody,
  });
  // Validate the complete response structure using typia.assert
  typia.assert(result);
  // Validate pagination metadata against expected values
  TestValidator.equals("page is 1", result.pagination.current, 1);
  TestValidator.equals("limit is 20", result.pagination.limit, 20);
  // Validate that data array contains at least one post (business logic)
  TestValidator.predicate("data array is not empty", result.data.length > 0);
}
