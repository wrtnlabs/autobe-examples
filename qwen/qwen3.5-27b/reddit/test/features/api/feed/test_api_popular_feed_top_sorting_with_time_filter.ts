import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_posts_votes_create } from "../../../generate/generate_random_reddit_clone_member_posts_votes_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_vote } from "../../../prepare/prepare_random_reddit_clone_post_vote";

/**
 * Test the popular feed endpoint with top sorting and time filter functionality.
 *
 * Validates that posts are correctly sorted by highest vote score within specified time ranges. Tests multiple time filters (today, week, month, all) to ensure each works correctly and returns appropriate subsets of posts.
 *
 * Special attention is given to verifying that: 1) Top sorting returns posts ordered by vote_score descending, 2) Time filters correctly restrict results to posts created within the specified period, 3) Posts with negative scores appear at the end when sorted by top, 4) Pagination metadata is correct.
 *
 * 1. Authenticate a member to enable post creation and voting.
 * 2. Subscribe member to a community (required for post creation).
 * 3. Create multiple posts with varying vote scores across different time periods.
 * 4. Cast votes on posts to create score variations including negative scores.
 * 5. Test popular feed with top sorting and different time filters (today, week, month, all).
 * 6. Validate sorting order, time filter restrictions, and pagination metadata.
 */
export async function test_api_popular_feed_top_sorting_with_time_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. Create a community and subscribe to it
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await generate_random_reddit_clone_member_subscriptions_create(
    memberConnection,
    {
      body: { community_id: communityId },
    },
  );
  // 3. Create multiple posts with different scores
  const posts: IRedditClonePost[] = [];
  // Create post that will have high positive score
  const highScorePost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: "High Score Post",
        post_type: "text",
        community_id: communityId,
        text_content: "This post should have a high score",
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(highScorePost);
  posts.push(highScorePost);
  // Create post that will have moderate score
  const moderateScorePost =
    await generate_random_reddit_clone_member_posts_create(memberConnection, {
      body: {
        title: "Moderate Score Post",
        post_type: "text",
        community_id: communityId,
        text_content: "This post should have a moderate score",
      } satisfies IRedditClonePost.ICreate,
    });
  typia.assert(moderateScorePost);
  posts.push(moderateScorePost);
  // Create post that will have negative score
  const lowScorePost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: "Low Score Post",
        post_type: "text",
        community_id: communityId,
        text_content: "This post should have a low score",
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(lowScorePost);
  posts.push(lowScorePost);
  // 4. Cast votes to create score variations
  // Note: Each user can only have one active vote per post
  // To create different scores, we need different voters or accept single vote per post
  // Upvote high score post (+1)
  await generate_random_reddit_clone_member_posts_votes_create(
    memberConnection,
    {
      params: { postId: highScorePost.id },
      body: { vote_type: "upvote" },
    },
  );
  // Upvote moderate score post (+1)
  await generate_random_reddit_clone_member_posts_votes_create(
    memberConnection,
    {
      params: { postId: moderateScorePost.id },
      body: { vote_type: "upvote" },
    },
  );
  // Downvote low score post (-1)
  await generate_random_reddit_clone_member_posts_votes_create(
    memberConnection,
    {
      params: { postId: lowScorePost.id },
      body: { vote_type: "downvote" },
    },
  );
  // 5. Test popular feed with top sorting and different time filters
  // Test with timeFilter: "all"
  const allTimeResult = await api.functional.redditClone.feeds.popular.index(
    memberConnection,
    {
      body: {
        sortType: "top",
        timeFilter: "all",
        limit: 100,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(allTimeResult);
  TestValidator.equals(
    "all time filter returns posts",
    allTimeResult.data.length,
    posts.length,
  );
  // Verify posts are sorted by vote_score descending
  for (let i = 0; i < allTimeResult.data.length - 1; i++) {
    TestValidator.predicate(
      `post ${i} has score >= post ${i + 1}`,
      allTimeResult.data[i].vote_score >= allTimeResult.data[i + 1].vote_score,
    );
  }
  // Test with timeFilter: "today"
  const todayResult = await api.functional.redditClone.feeds.popular.index(
    memberConnection,
    {
      body: {
        sortType: "top",
        timeFilter: "today",
        limit: 100,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(todayResult);
  // All posts were created in this test execution (today)
  TestValidator.equals(
    "today filter returns posts created today",
    todayResult.data.length,
    posts.length,
  );
  // Test with timeFilter: "week"
  const weekResult = await api.functional.redditClone.feeds.popular.index(
    memberConnection,
    {
      body: {
        sortType: "top",
        timeFilter: "week",
        limit: 100,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(weekResult);
  // All posts were created today, which is within the week
  TestValidator.equals(
    "week filter returns posts created this week",
    weekResult.data.length,
    posts.length,
  );
  // Test with timeFilter: "month"
  const monthResult = await api.functional.redditClone.feeds.popular.index(
    memberConnection,
    {
      body: {
        sortType: "top",
        timeFilter: "month",
        limit: 100,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(monthResult);
  // All posts were created today, which is within the month
  TestValidator.equals(
    "month filter returns posts created this month",
    monthResult.data.length,
    posts.length,
  );
  // 6. Verify negative score posts appear at the end
  if (allTimeResult.data.length > 0) {
    const lastPost = allTimeResult.data[allTimeResult.data.length - 1];
    TestValidator.predicate(
      "last post has lowest score (negative or zero)",
      lastPost.vote_score <= 0,
    );
  }
  // 7. Verify first post has highest score
  if (allTimeResult.data.length > 0) {
    const firstPost = allTimeResult.data[0];
    TestValidator.predicate(
      "first post has highest score (positive)",
      firstPost.vote_score >= 1,
    );
  }
}
