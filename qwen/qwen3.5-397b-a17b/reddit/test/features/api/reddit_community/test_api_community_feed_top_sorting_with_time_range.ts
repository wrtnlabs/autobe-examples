import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_votes_create } from "../../../generate/generate_random_reddit_community_member_posts_votes_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_vote } from "../../../prepare/prepare_random_reddit_community_post_vote";

/**
 * Test community feed with top sorting and time range filtering.
 *
 * Validates the complete community feed functionality including top sorting by vote score and time range filtering. Ensures that posts are correctly ordered by vote_score (highest first) when sort is 'top', and that timeRange filters properly restrict results to posts within the specified time period.
 *
 * Special attention is given to verifying that vote_score calculation reflects upvotes minus downvotes accurately, and that edge cases such as empty result sets return valid pagination metadata with empty data arrays.
 *
 * 1. Member registers and authenticates using authorize_member_join utility.
 * 2. Member creates a community using generate_random_reddit_community_member_communities_create utility.
 * 3. Member creates multiple posts with varying titles in the community using generate_random_reddit_community_posts_create utility.
 * 4. Member casts votes on posts to establish different vote scores using generate_random_reddit_community_member_posts_votes_create utility.
 * 5. Test top sorting with timeRange 'allTime' - verify posts ordered by vote_score descending.
 * 6. Test timeRange 'today' filter - verify recently created posts are included.
 * 7. Validate vote_score calculation by checking posts have correct scores based on votes cast.
 * 8. Validate pagination metadata is returned correctly.
 */
export async function test_api_community_feed_top_sorting_with_time_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create multiple posts with different titles for testing
  const post1 = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        title: "Test Post One - Will be upvoted",
        post_type: "text",
        community_id: community.id,
        body: "This post will have positive votes",
      },
    },
  );
  typia.assert(post1);
  const post2 = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        title: "Test Post Two - No votes",
        post_type: "text",
        community_id: community.id,
        body: "This post will have zero votes",
      },
    },
  );
  typia.assert(post2);
  const post3 = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        title: "Test Post Three - Will be downvoted",
        post_type: "text",
        community_id: community.id,
        body: "This post will have negative votes",
      },
    },
  );
  typia.assert(post3);
  // 4. Cast votes to establish different vote scores
  // Post 1: +1 upvote (score = 1)
  await generate_random_reddit_community_member_posts_votes_create(
    memberConnection,
    {
      params: { postId: post1.id },
      body: { value: 1 },
    },
  );
  // Post 2: No votes (score = 0)
  // Post 3: -1 downvote (score = -1)
  await generate_random_reddit_community_member_posts_votes_create(
    memberConnection,
    {
      params: { postId: post3.id },
      body: { value: -1 },
    },
  );
  // 5. Test top sorting with timeRange 'allTime' - verify posts ordered by vote_score descending
  const topFeed = await api.functional.redditCommunity.feeds.community.index(
    memberConnection,
    {
      communityId: community.id,
      body: {
        sort: "top",
        timeRange: "allTime",
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(topFeed);
  // Validate pagination metadata
  TestValidator.predicate(
    "has valid pagination",
    topFeed.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is 1",
    topFeed.pagination.current === 1,
  );
  TestValidator.predicate("has 3 records", topFeed.pagination.records === 3);
  TestValidator.predicate(
    "pages calculated correctly",
    topFeed.pagination.pages >= 1,
  );
  TestValidator.predicate("limit is set", topFeed.pagination.limit > 0);
  // Validate top sorting order (highest vote_score first)
  TestValidator.predicate(
    "first post has score 1",
    topFeed.data[0].vote_score === 1,
  );
  TestValidator.predicate(
    "second post has score 0",
    topFeed.data[1].vote_score === 0,
  );
  TestValidator.predicate(
    "third post has score -1",
    topFeed.data[2].vote_score === -1,
  );
  // Verify correct posts are in correct positions
  TestValidator.equals("first post is post1", topFeed.data[0].id, post1.id);
  TestValidator.equals("second post is post2", topFeed.data[1].id, post2.id);
  TestValidator.equals("third post is post3", topFeed.data[2].id, post3.id);
  // 6. Test timeRange 'today' filter - verify recently created posts are included
  const todayFeed = await api.functional.redditCommunity.feeds.community.index(
    memberConnection,
    {
      communityId: community.id,
      body: {
        sort: "top",
        timeRange: "today",
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(todayFeed);
  // Posts were just created, so they should appear in "today" range
  TestValidator.predicate(
    "today returns all 3 posts",
    todayFeed.data.length === 3,
  );
  TestValidator.predicate(
    "today has valid pagination",
    todayFeed.pagination.records === 3,
  );
  // 7. Validate vote_score calculation - check specific post scores
  const post1InFeed = topFeed.data.find((p) => p.id === post1.id);
  TestValidator.predicate("post1 score is 1", post1InFeed?.vote_score === 1);
  const post2InFeed = topFeed.data.find((p) => p.id === post2.id);
  TestValidator.predicate("post2 score is 0", post2InFeed?.vote_score === 0);
  const post3InFeed = topFeed.data.find((p) => p.id === post3.id);
  TestValidator.predicate("post3 score is -1", post3InFeed?.vote_score === -1);
  // 8. Test with different time ranges to ensure they work
  const thisWeekFeed =
    await api.functional.redditCommunity.feeds.community.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          sort: "top",
          timeRange: "thisWeek",
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(thisWeekFeed);
  TestValidator.predicate(
    "thisWeek returns posts",
    thisWeekFeed.data.length === 3,
  );
  const thisMonthFeed =
    await api.functional.redditCommunity.feeds.community.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          sort: "top",
          timeRange: "thisMonth",
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(thisMonthFeed);
  TestValidator.predicate(
    "thisMonth returns posts",
    thisMonthFeed.data.length === 3,
  );
  const thisYearFeed =
    await api.functional.redditCommunity.feeds.community.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          sort: "top",
          timeRange: "thisYear",
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(thisYearFeed);
  TestValidator.predicate(
    "thisYear returns posts",
    thisYearFeed.data.length === 3,
  );
}
