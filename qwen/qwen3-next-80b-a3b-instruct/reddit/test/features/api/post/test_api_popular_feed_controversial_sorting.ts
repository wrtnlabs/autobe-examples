import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
export async function test_api_popular_feed_controversial_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create anonymous connection for public feed access
  const anonymousConnection: api.IConnection = { host: connection.host };
  // Configure the controversial sort request
  const request: ICommunityPlatformPost.IRequest = {
    sort: "controversial", // Must be exactly "controversial" per schema definition
    page: 1,
    limit: 10,
  };
  // Execute the API call to get the popular feed with controversial sorting
  const response: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.posts.popular.index(
      anonymousConnection,
      { body: request },
    );
  // Validate response conforms to schema
  typia.assert(response);
  // Verify pagination: should match request parameters
  TestValidator.equals(
    "pagination page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    response.pagination.limit,
    10,
  );
  // Validate that returned posts are controversial (net score between -2 and +2)
  // Controversial posts are defined as having net score between -2 and +2
  response.data.forEach((post) => {
    TestValidator.predicate(
      "post vote score should be between -2 and +2",
      post.voteScore >= -2 && post.voteScore <= 2,
    );
  });
  // Note: We cannot validate the sort order by total votes because
  // the API response does not provide upvotes/downvotes or total votes.
  // The incremental portion of the test cannot be completed due to data visibility limitations.
  // We can only verify the critical constraint: all posts have net score between -2 and +2.
  // Since we cannot validate the sorting algorithm, we assume the API correctly sorts by total votes.
}
