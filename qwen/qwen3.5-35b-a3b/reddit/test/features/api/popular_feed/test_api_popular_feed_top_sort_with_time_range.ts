import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPopularFeedRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPopularFeedRequest";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_posts_vote } from "../../../generate/generate_random_reddit_platform_member_posts_vote";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post_vote } from "../../../prepare/prepare_random_reddit_platform_post_vote";

export async function test_api_popular_feed_top_sort_with_time_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create a community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create multiple posts with different vote scores
  const posts: IRedditPlatformPost[] = [];
  // Post 1: Will have highest score (+10 upvotes)
  const post1 = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: "Highest Score Post",
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post1);
  posts.push(post1);
  // Post 2: Will have medium-high score (+8 upvotes)
  const post2 = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: "Medium-High Score Post",
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post2);
  posts.push(post2);
  // Post 3: Will have medium score (+5 upvotes)
  const post3 = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: "Medium Score Post",
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post3);
  posts.push(post3);
  // Post 4: Will have low score (+3 upvotes)
  const post4 = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: "Low Score Post",
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post4);
  posts.push(post4);
  // Post 5: Will have very low score (+1 upvote)
  const post5 = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: "Very Low Score Post",
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post5);
  posts.push(post5);
  // Cast votes to create different scores
  // Post1: +10 upvotes (score = 10)
  for (let i = 0; i < 10; i++) {
    await api.functional.redditPlatform.member.posts.vote(memberConnection, {
      postId: post1.id,
      body: { vote_type: "up" },
    });
  }
  // Post2: +8 upvotes (score = 8)
  for (let i = 0; i < 8; i++) {
    await api.functional.redditPlatform.member.posts.vote(memberConnection, {
      postId: post2.id,
      body: { vote_type: "up" },
    });
  }
  // Post3: +5 upvotes (score = 5)
  for (let i = 0; i < 5; i++) {
    await api.functional.redditPlatform.member.posts.vote(memberConnection, {
      postId: post3.id,
      body: { vote_type: "up" },
    });
  }
  // Post4: +3 upvotes (score = 3)
  for (let i = 0; i < 3; i++) {
    await api.functional.redditPlatform.member.posts.vote(memberConnection, {
      postId: post4.id,
      body: { vote_type: "up" },
    });
  }
  // Post5: +1 upvote (score = 1)
  for (let i = 0; i < 1; i++) {
    await api.functional.redditPlatform.member.posts.vote(memberConnection, {
      postId: post5.id,
      body: { vote_type: "up" },
    });
  }
  // 4. Test 'top' sort with 'today' time range
  const todayFeed =
    await api.functional.redditPlatform.member.feeds.popular.index(
      memberConnection,
      {
        body: {
          sort: "top" as const,
          topTimeRange: "today" as const,
          limit: 20,
        },
      },
    );
  typia.assert(todayFeed);
  TestValidator.equals(
    "today feed has correct post count",
    todayFeed.data.length,
    5,
  );
  // Verify posts are ordered by score descending
  TestValidator.equals(
    "today feed highest score first",
    todayFeed.data[0].id,
    post1.id,
  );
  TestValidator.equals(
    "today feed second highest",
    todayFeed.data[1].id,
    post2.id,
  );
  TestValidator.equals(
    "today feed third highest",
    todayFeed.data[2].id,
    post3.id,
  );
  TestValidator.equals(
    "today feed fourth highest",
    todayFeed.data[3].id,
    post4.id,
  );
  TestValidator.equals(
    "today feed lowest score last",
    todayFeed.data[4].id,
    post5.id,
  );
  // 5. Test 'top' sort with 'week' time range
  const weekFeed =
    await api.functional.redditPlatform.member.feeds.popular.index(
      memberConnection,
      {
        body: {
          sort: "top" as const,
          topTimeRange: "week" as const,
          limit: 20,
        },
      },
    );
  typia.assert(weekFeed);
  TestValidator.equals(
    "week feed has correct post count",
    weekFeed.data.length,
    5,
  );
  TestValidator.equals(
    "week feed highest score first",
    weekFeed.data[0].id,
    post1.id,
  );
  // 6. Test 'top' sort with 'month' time range
  const monthFeed =
    await api.functional.redditPlatform.member.feeds.popular.index(
      memberConnection,
      {
        body: {
          sort: "top" as const,
          topTimeRange: "month" as const,
          limit: 20,
        },
      },
    );
  typia.assert(monthFeed);
  TestValidator.equals(
    "month feed has correct post count",
    monthFeed.data.length,
    5,
  );
  TestValidator.equals(
    "month feed highest score first",
    monthFeed.data[0].id,
    post1.id,
  );
  // 7. Test 'top' sort with 'year' time range
  const yearFeed =
    await api.functional.redditPlatform.member.feeds.popular.index(
      memberConnection,
      {
        body: {
          sort: "top" as const,
          topTimeRange: "year" as const,
          limit: 20,
        },
      },
    );
  typia.assert(yearFeed);
  TestValidator.equals(
    "year feed has correct post count",
    yearFeed.data.length,
    5,
  );
  TestValidator.equals(
    "year feed highest score first",
    yearFeed.data[0].id,
    post1.id,
  );
  // 8. Test 'top' sort with 'all' time range
  const allFeed =
    await api.functional.redditPlatform.member.feeds.popular.index(
      memberConnection,
      {
        body: {
          sort: "top" as const,
          topTimeRange: "all" as const,
          limit: 20,
        },
      },
    );
  typia.assert(allFeed);
  TestValidator.equals(
    "all feed has correct post count",
    allFeed.data.length,
    5,
  );
  TestValidator.equals(
    "all feed highest score first",
    allFeed.data[0].id,
    post1.id,
  );
  // 9. Test 'top' sort with omitted topTimeRange (should default to 'all')
  const defaultFeed =
    await api.functional.redditPlatform.member.feeds.popular.index(
      memberConnection,
      {
        body: {
          sort: "top" as const,
          limit: 20,
        },
      },
    );
  typia.assert(defaultFeed);
  TestValidator.equals(
    "default feed has correct post count",
    defaultFeed.data.length,
    5,
  );
  TestValidator.equals(
    "default feed highest score first",
    defaultFeed.data[0].id,
    post1.id,
  );
  // Verify default feed is same as 'all' feed
  TestValidator.equals(
    "default feed matches all feed",
    defaultFeed.data[0].id,
    allFeed.data[0].id,
  );
  // 10. Test 'new' sort with topTimeRange provided (topTimeRange should be ignored)
  const newFeed =
    await api.functional.redditPlatform.member.feeds.popular.index(
      memberConnection,
      {
        body: {
          sort: "new" as const,
          topTimeRange: "today" as const,
          limit: 20,
        },
      },
    );
  typia.assert(newFeed);
  TestValidator.equals("new feed ignores topTimeRange", newFeed.data.length, 5);
  // Should return posts sorted by created_at DESC (newest first)
  // Since all posts created at same time, order may vary but should be deterministic
  TestValidator.predicate(
    "new feed returns valid posts",
    newFeed.data.length > 0,
  );
  // 11. Test 'top' sort with 'controversial' (should not include time range filter)
  const controversialFeed =
    await api.functional.redditPlatform.member.feeds.popular.index(
      memberConnection,
      {
        body: {
          sort: "controversial" as const,
          limit: 20,
        },
      },
    );
  typia.assert(controversialFeed);
  TestValidator.equals(
    "controversial feed has correct post count",
    controversialFeed.data.length,
    5,
  );
}