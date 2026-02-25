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

export async function test_api_feed_popular_authenticated_user_with_custom_sorting_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Prepare request parameters for popular feed
  const request: IRedditCommunityPost.IRequest = {
    sort: "top",
    page: 3,
    limit: 10,
  };
  // Make the request to the popular feed endpoint
  const response: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.feed.popular.index(connection, {
      body: request,
    });
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    3,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records >= 10",
    response.pagination.records >= 10,
  );
  TestValidator.predicate(
    "pagination pages >= 3",
    response.pagination.pages >= 3,
  );
  // Validate response has exactly 10 posts
  TestValidator.equals(
    "response has exactly 10 posts",
    response.data.length,
    10,
  );
  // Validate that posts are sorted by voteScore in descending order (top sort)
  const voteScores = response.data.map((post) => post.voteScore);
  const isSortedDescending = voteScores.every((score, index) => {
    if (index === 0) return true;
    return score <= voteScores[index - 1];
  });
  TestValidator.predicate("posts sorted by voteScore DESC", isSortedDescending);
}
