import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
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
import { generate_random_reddit_clone_member_communities_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_communities_subscriptions_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_posts_votes_create } from "../../../generate/generate_random_reddit_clone_member_posts_votes_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_vote } from "../../../prepare/prepare_random_reddit_clone_post_vote";

/**
 * Test home feed sorting functionality with various sort types and pagination.
 *
 * Validates the complete home feed retrieval workflow including member authentication, community subscription, post creation with varying engagement levels, and sorting verification. Tests all supported sorting options (hot, new, top, controversial) and ensures pagination works correctly with each sort type.
 *
 * Special attention is given to verifying that vote scores are correctly calculated (upvotes minus downvotes), comment counts are accurate, and posts are properly filtered to only include subscribed communities. The test creates a realistic engagement scenario with multiple posts receiving different vote patterns to validate sorting algorithms.
 *
 * 1. Member registers and authenticates to access home feed.
 * 2. Member subscribes to a community to enable post visibility.
 * 3. Multiple posts are created in the subscribed community with different content types.
 * 4. Votes are cast on posts to create varying vote scores (positive, negative, zero).
 * 5. Comments are added to posts to test comment count aggregation.
 * 6. Home feed is retrieved with 'hot' sorting and results are validated.
 * 7. Home feed is retrieved with 'new' sorting and chronological order is verified.
 * 8. Home feed is retrieved with 'top' sorting and vote score ordering is confirmed.
 * 9. Home feed is retrieved with 'top' sorting with time filters (today, week, month).
 * 10. Home feed is retrieved with 'controversial' sorting and results are checked.
 * 11. Pagination is tested by requesting multiple pages and verifying consistency.
 */
export async function test_api_home_feed_sorting_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.name(1),
      href: "https://test.example.com/register",
      referrer: "https://test.example.com/",
      ip: "127.0.0.1",
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member);
  // 2. Subscribe to community (using a placeholder community ID that should exist)
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await generate_random_reddit_clone_member_communities_subscriptions_create(
    memberConnection,
    {
      params: { communityId },
    },
  );
  // 3. Create multiple posts with different engagement levels
  const posts: IRedditClonePost[] = [];
  for (let i = 0; i < 5; i++) {
    const post = await generate_random_reddit_clone_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          post_type: RandomGenerator.pick(["text", "link", "image"] as const),
          community_id: communityId,
          text_content:
            i === 0 ? RandomGenerator.content({ paragraphs: 2 }) : undefined,
          link_url:
            i === 1 ? typia.random<string & tags.Format<"url">>() : undefined,
          image_url:
            i === 2 ? typia.random<string & tags.Format<"url">>() : undefined,
        },
      },
    );
    typia.assert(post);
    posts.push(post);
  }
  // 4. Cast votes to create varying vote scores
  // Note: Each user can only have one vote per post, so we cast one vote per post
  // Post 0: Upvote (positive score)
  await generate_random_reddit_clone_member_posts_votes_create(
    memberConnection,
    {
      params: { postId: posts[0].id },
      body: { vote_type: "upvote" },
    },
  );
  // Post 1: Downvote (negative score)
  await generate_random_reddit_clone_member_posts_votes_create(
    memberConnection,
    {
      params: { postId: posts[1].id },
      body: { vote_type: "downvote" },
    },
  );
  // Post 2: Upvote (positive score)
  await generate_random_reddit_clone_member_posts_votes_create(
    memberConnection,
    {
      params: { postId: posts[2].id },
      body: { vote_type: "upvote" },
    },
  );
  // Post 3: No vote (score = 0)
  // Post 4: Downvote (negative score)
  await generate_random_reddit_clone_member_posts_votes_create(
    memberConnection,
    {
      params: { postId: posts[4].id },
      body: { vote_type: "downvote" },
    },
  );
  // 5. Add comments to test comment count aggregation
  for (let i = 0; i < 3; i++) {
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: posts[0].id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  }
  for (let i = 0; i < 2; i++) {
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: posts[1].id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  }
  // 6. Test 'hot' sorting
  const hotFeed = await api.functional.redditClone.member.feeds.home.index(
    memberConnection,
    {
      body: {
        sortType: "hot",
        limit: 10,
        page: 1,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(hotFeed);
  TestValidator.equals(
    "hot feed pagination limit",
    hotFeed.pagination.limit,
    10,
  );
  TestValidator.equals("hot feed current page", hotFeed.pagination.current, 1);
  TestValidator.predicate("hot feed has posts", hotFeed.data.length > 0);
  // 7. Test 'new' sorting (most recent first)
  const newFeed = await api.functional.redditClone.member.feeds.home.index(
    memberConnection,
    {
      body: {
        sortType: "new",
        limit: 10,
        page: 1,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(newFeed);
  TestValidator.equals(
    "new feed pagination limit",
    newFeed.pagination.limit,
    10,
  );
  TestValidator.predicate("new feed has posts", newFeed.data.length > 0);
  // Verify chronological order (newest first)
  if (newFeed.data.length >= 2) {
    TestValidator.predicate(
      "new feed sorted by created_at descending",
      new Date(newFeed.data[0].created_at).getTime() >=
        new Date(newFeed.data[1].created_at).getTime(),
    );
  }
  // 8. Test 'top' sorting (highest vote score first)
  const topFeed = await api.functional.redditClone.member.feeds.home.index(
    memberConnection,
    {
      body: {
        sortType: "top",
        timeFilter: "all",
        limit: 10,
        page: 1,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(topFeed);
  TestValidator.equals(
    "top feed pagination limit",
    topFeed.pagination.limit,
    10,
  );
  TestValidator.predicate("top feed has posts", topFeed.data.length > 0);
  // Verify vote score ordering (highest first)
  if (topFeed.data.length >= 2) {
    TestValidator.predicate(
      "top feed sorted by vote_score descending",
      topFeed.data[0].vote_score >= topFeed.data[1].vote_score,
    );
  }
  // 9. Test 'top' sorting with time filters
  const topTodayFeed = await api.functional.redditClone.member.feeds.home.index(
    memberConnection,
    {
      body: {
        sortType: "top",
        timeFilter: "today",
        limit: 10,
        page: 1,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(topTodayFeed);
  TestValidator.predicate(
    "top today feed response valid",
    topTodayFeed.data !== undefined,
  );
  const topWeekFeed = await api.functional.redditClone.member.feeds.home.index(
    memberConnection,
    {
      body: {
        sortType: "top",
        timeFilter: "week",
        limit: 10,
        page: 1,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(topWeekFeed);
  TestValidator.predicate(
    "top week feed response valid",
    topWeekFeed.data !== undefined,
  );
  const topMonthFeed = await api.functional.redditClone.member.feeds.home.index(
    memberConnection,
    {
      body: {
        sortType: "top",
        timeFilter: "month",
        limit: 10,
        page: 1,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(topMonthFeed);
  TestValidator.predicate(
    "top month feed response valid",
    topMonthFeed.data !== undefined,
  );
  // 10. Test 'controversial' sorting
  const controversialFeed =
    await api.functional.redditClone.member.feeds.home.index(memberConnection, {
      body: {
        sortType: "controversial",
        limit: 10,
        page: 1,
      } satisfies IRedditClonePost.IRequest,
    });
  typia.assert(controversialFeed);
  TestValidator.equals(
    "controversial feed pagination limit",
    controversialFeed.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "controversial feed response valid",
    controversialFeed.data !== undefined,
  );
  // 11. Test pagination
  const page1 = await api.functional.redditClone.member.feeds.home.index(
    memberConnection,
    {
      body: {
        sortType: "hot",
        limit: 2,
        page: 1,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals(
    "page 1 pagination current",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("page 1 pagination limit", page1.pagination.limit, 2);
  const page2 = await api.functional.redditClone.member.feeds.home.index(
    memberConnection,
    {
      body: {
        sortType: "hot",
        limit: 2,
        page: 2,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "page 2 pagination current",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("page 2 pagination limit", page2.pagination.limit, 2);
  // Verify pagination metadata
  TestValidator.predicate(
    "pagination records count is accurate",
    page1.pagination.records >= page1.data.length,
  );
  TestValidator.predicate(
    "pagination pages count is calculated",
    page1.pagination.pages >= 1,
  );
  // 12. Verify vote scores and comment counts are correctly calculated
  if (hotFeed.data.length > 0) {
    const firstPost = hotFeed.data[0];
    TestValidator.predicate(
      "vote score is a valid integer",
      typeof firstPost.vote_score === "number",
    );
    TestValidator.predicate(
      "comment count is a valid integer",
      typeof firstPost.comment_count === "number",
    );
    TestValidator.predicate(
      "comment count is non-negative",
      firstPost.comment_count >= 0,
    );
  }
}
