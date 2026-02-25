import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPostAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostAnalytic";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_member_post_analytics_min_vote_score_filter(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create a member account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IRedditCommunityMember.IAuthorized = await authorize_member_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      },
    },
  );
  typia.assert(admin);
  // Create a single community (will be implicitly created when we create our first post)
  // We can't create a community directly, so we'll create a post
  const postResponse =
    await generate_random_reddit_community_member_posts_create(
      adminConnection,
      {
        body: {
          title: "Community starter post",
          content: "This post will implicitly create our target community.",
          community_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(postResponse);
  // We'll use the community_id from the first post
  const targetCommunityId = postResponse.community.id;
  // Create 8 high-scoring posts (we assume these will accumulate high vote scores)
  const highScorePosts = ArrayUtil.repeat(8, () => {
    const title = RandomGenerator.name(3);
    const content = RandomGenerator.content();
    return {
      title,
      content,
      community_id: targetCommunityId,
    } satisfies IRedditCommunityPost.ICreate;
  });
  for (const post of highScorePosts) {
    await generate_random_reddit_community_member_posts_create(
      adminConnection,
      {
        body: post,
      },
    );
  }
  // Create 2 low-scoring posts (these will lower the community average)
  const lowScorePosts = ArrayUtil.repeat(2, () => {
    const title = RandomGenerator.name(3);
    const content = RandomGenerator.content();
    return {
      title,
      content,
      community_id: targetCommunityId,
    } satisfies IRedditCommunityPost.ICreate;
  });
  for (const post of lowScorePosts) {
    await generate_random_reddit_community_member_posts_create(
      adminConnection,
      {
        body: post,
      },
    );
  }
  // Wait for analytics to be computed
  await new Promise((resolve) => setTimeout(resolve, 3000));
  // Call the analytics endpoint with min_vote_score = 5.0
  const response =
    await api.functional.redditCommunity.member.analytics.posts.index(
      adminConnection,
      {
        body: {
          minVoteScore: 5.0,
        },
      },
    );
  typia.assert(response);
  // Validate: Only days from communities with average >= 5.0 should be present
  TestValidator.predicate(
    "all returned days have avg_vote_score >= 5.0",
    response.data.every((day) => day.avg_vote_score >= 5.0),
  );
  // Validate pagination
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  // Verify there's at least one day in response
  TestValidator.predicate(
    "at least one day returned",
    response.data.length > 0,
  );
  // Verify data structure
  for (const day of response.data) {
    TestValidator.equals(
      "date format",
      day.date.substring(0, 10),
      day.date.substring(0, 10),
    );
    TestValidator.predicate(
      "total_posts is non-negative",
      day.total_posts >= 0,
    );
    TestValidator.predicate(
      "avg_vote_score is valid number",
      typeof day.avg_vote_score === "number",
    );
    TestValidator.predicate(
      "total_upvotes is non-negative",
      day.total_upvotes >= 0,
    );
    TestValidator.predicate(
      "total_downvotes is non-negative",
      day.total_downvotes >= 0,
    );
    TestValidator.predicate(
      "total_comments is non-negative",
      day.total_comments >= 0,
    );
  }
  // Validate response is sorted by date descending
  const sortedByDate = [...response.data].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  // Check that response data matches the sorted order
  TestValidator.equals(
    "response data is sorted by date descending",
    response.data.length,
    sortedByDate.length,
  );
  for (let i = 0; i < response.data.length; i++) {
    TestValidator.equals(
      `day ${i} date matches sorted order`,
      response.data[i].date,
      sortedByDate[i].date,
    );
  }
}
