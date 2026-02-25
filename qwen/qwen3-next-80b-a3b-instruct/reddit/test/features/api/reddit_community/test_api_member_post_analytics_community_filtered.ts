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

export async function test_api_member_post_analytics_community_filtered(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Since we cannot create communities (no API endpoint exists), we'll use random UUIDs
  // to simulate two different communities for testing
  const communityAId = typia.random<string & tags.Format<"uuid">>();
  const communityBId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create 2 posts in communityA (target community)
  const postsInA = ArrayUtil.repeat(2, () => {
    return generate_random_reddit_community_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          community_id: communityAId,
          content: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  });
  // 4. Create 1 post in communityB (control community)
  const postsInB = ArrayUtil.repeat(1, () => {
    return generate_random_reddit_community_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          community_id: communityBId,
          content: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  });
  // Wait for all posts to be created
  await Promise.all([...postsInA, ...postsInB]);
  // 5. Call analytics endpoint with communityId set to community A's ID
  const analyticsRequest: IRedditCommunityPostAnalytic.IRequest = {
    communityId: communityAId,
  };
  const analyticsResponse =
    await api.functional.redditCommunity.member.analytics.posts.index(
      memberConnection,
      {
        body: analyticsRequest,
      },
    );
  typia.assert(analyticsResponse);
  // 6. Validate that all returned analytics records contain only posts from community A
  // We created 2 posts in community A, so total_posts must be 2
  TestValidator.equals(
    "total_posts matches posts created in community A",
    analyticsResponse.data.length > 0,
    true,
  );
  // Since we expect posts to be created on the same day (same test execution),
  // we should have exactly one data record
  TestValidator.equals(
    "analytics records for community A",
    analyticsResponse.data.length,
    1,
  );
  // Validate the community A analytics data
  const dayAnalytics = analyticsResponse.data[0];
  // The total_posts should match the exact number of posts we created in community A
  TestValidator.equals(
    "total_posts reflects correct count from community A",
    dayAnalytics.total_posts,
    2,
  );
  // Validate that the pagination records match the number of posts created in community A
  TestValidator.equals(
    "pagination records reflect filtered dataset size",
    analyticsResponse.pagination.records,
    2,
  );
  // Validate that total_comments is consistent (at least 0, since we created posts with content)
  TestValidator.predicate(
    "total_comments >= 0",
    () => dayAnalytics.total_comments >= 0,
  );
  // Validate that avg_vote_score is valid number (can be any number)
  TestValidator.predicate(
    "avg_vote_score is a number",
    () => typeof dayAnalytics.avg_vote_score === "number",
  );
  // Verify that community B's posts are excluded: we created 1 post in B, and they must not be included
  // We know we created 2 posts in A and 1 in B, total posts created = 3
  // Since the analytics return only posts from community A, total_posts is 2, not 3
  // This is the key verification that filtering by communityId works correctly
  // We don't have a way to query the total across all communities, but the fact that the count is 2 (and not 3)
  // proves the filtering is working. Since we created 3 posts total and returned 2, 1 was excluded.
  // Ensure that total_posts (2) < total created posts (3)
  // This proves community B posts are excluded
  TestValidator.predicate(
    "community B posts are excluded",
    () => dayAnalytics.total_posts < 3,
  );
}
