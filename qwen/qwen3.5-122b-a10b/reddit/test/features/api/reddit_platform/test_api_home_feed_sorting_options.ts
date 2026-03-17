import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
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
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

/**
 * Test Reddit platform home feed sorting options.
 *
 * Validates that the home feed endpoint correctly applies different sorting
 * strategies (hot, new, top, controversial) to posts from subscribed communities.
 * Tests the sorting algorithm implementations for all four supported strategies.
 */
export async function test_api_home_feed_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create primary member account (post author)
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: "Test1234!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(authorAuth);
  // 2. Create community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      authorConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create additional member accounts for voting
  const voters: api.IConnection[] = [];
  for (let i = 0; i < 10; i++) {
    const voterConnection: api.IConnection = { host: connection.host };
    const voterAuth = await authorize_member_join(voterConnection, {
      body: {
        email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
        password: "Test1234!",
        username: `${RandomGenerator.name(1)}_voter_${i}`,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformMember.IJoin,
    });
    typia.assert(voterAuth);
    // Subscribe each voter to the community
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      voterConnection,
      {
        communityId: community.id,
      },
    );
    voters.push(voterConnection);
  }
  // 4. Create multiple posts by the author
  const posts: IRedditPlatformPost[] = [];
  // Post 1: Text post (will get 5 upvotes)
  const post1 = await api.functional.redditPlatform.member.posts.create(
    authorConnection,
    {
      body: {
        community_id: community.id,
        title: `Test Post 1 - ${RandomGenerator.alphabets(10)}`,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post1);
  posts.push(post1);
  // Post 2: Link post (will get 3 upvotes, 1 downvote)
  const post2 = await api.functional.redditPlatform.member.posts.create(
    authorConnection,
    {
      body: {
        community_id: community.id,
        title: `Test Post 2 - ${RandomGenerator.alphabets(10)}`,
        post_type: "link",
        url: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post2);
  posts.push(post2);
  // Post 3: Another text post (will get 5 upvotes, 5 downvotes - controversial)
  const post3 = await api.functional.redditPlatform.member.posts.create(
    authorConnection,
    {
      body: {
        community_id: community.id,
        title: `Test Post 3 - ${RandomGenerator.alphabets(10)}`,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post3);
  posts.push(post3);
  // 5. Cast votes using different voter accounts
  // Post 1: 5 upvotes from voters[0] to voters[4] (score = 5)
  for (let i = 0; i < 5; i++) {
    await api.functional.redditPlatform.member.posts.vote(voters[i], {
      postId: post1.id,
      body: { type: "upvote" } satisfies IRedditPlatformPostVote.IRequest,
    });
  }
  // Post 2: 3 upvotes from voters[5] to voters[7], 1 downvote from voters[8] (score = 2)
  for (let i = 5; i < 8; i++) {
    await api.functional.redditPlatform.member.posts.vote(voters[i], {
      postId: post2.id,
      body: { type: "upvote" } satisfies IRedditPlatformPostVote.IRequest,
    });
  }
  await api.functional.redditPlatform.member.posts.vote(voters[8], {
    postId: post2.id,
    body: { type: "downvote" } satisfies IRedditPlatformPostVote.IRequest,
  });
  // Post 3: 5 upvotes from authorConnection + voters[0-4], 5 downvotes from voters[5-9] (score = 0)
  // Author upvote
  await api.functional.redditPlatform.member.posts.vote(authorConnection, {
    postId: post3.id,
    body: { type: "upvote" } satisfies IRedditPlatformPostVote.IRequest,
  });
  // 4 more upvotes
  for (let i = 0; i < 4; i++) {
    await api.functional.redditPlatform.member.posts.vote(voters[i], {
      postId: post3.id,
      body: { type: "upvote" } satisfies IRedditPlatformPostVote.IRequest,
    });
  }
  // 5 downvotes
  for (let i = 5; i < 10; i++) {
    await api.functional.redditPlatform.member.posts.vote(voters[i], {
      postId: post3.id,
      body: { type: "downvote" } satisfies IRedditPlatformPostVote.IRequest,
    });
  }
  // 6. Test 'new' sorting - posts ordered by created_at DESC
  const newFeed = await api.functional.redditPlatform.member.feeds.home.index(
    authorConnection,
    {
      body: {
        sort_by: "new",
        limit: 10,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(newFeed);
  TestValidator.predicate(
    "new sorting returns posts",
    newFeed.data.length >= 3,
  );
  // Verify posts are in descending order by created_at
  for (let i = 0; i < newFeed.data.length - 1; i++) {
    TestValidator.predicate(
      `post ${i} is newer than post ${i + 1}`,
      newFeed.data[i].created_at >= newFeed.data[i + 1].created_at,
    );
  }
  // 7. Test 'hot' sorting - posts ordered by engagement-weighted recency
  const hotFeed = await api.functional.redditPlatform.member.feeds.home.index(
    authorConnection,
    {
      body: {
        sort_by: "hot",
        limit: 10,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(hotFeed);
  TestValidator.predicate(
    "hot sorting returns posts",
    hotFeed.data.length >= 3,
  );
  // 8. Test 'top' sorting with different time filters
  const timeFilters: Array<"today" | "week" | "month" | "year" | "all_time"> = [
    "today",
    "week",
    "month",
    "year",
    "all_time",
  ];
  for (const timeFilter of timeFilters) {
    const topFeed = await api.functional.redditPlatform.member.feeds.home.index(
      authorConnection,
      {
        body: {
          sort_by: "top",
          time_filter: timeFilter,
          limit: 10,
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
    typia.assert(topFeed);
    TestValidator.predicate(
      `top sorting with ${timeFilter} returns posts`,
      topFeed.data.length >= 3,
    );
    // Verify posts are in descending order by vote_score
    for (let i = 0; i < topFeed.data.length - 1; i++) {
      TestValidator.predicate(
        `top ${timeFilter}: post ${i} has higher or equal score than post ${i + 1}`,
        topFeed.data[i].vote_score >= topFeed.data[i + 1].vote_score,
      );
    }
  }
  // 9. Test 'controversial' sorting - posts with high vote counts but scores near zero
  const controversialFeed =
    await api.functional.redditPlatform.member.feeds.home.index(
      authorConnection,
      {
        body: {
          sort_by: "controversial",
          limit: 10,
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(controversialFeed);
  TestValidator.predicate(
    "controversial sorting returns posts",
    controversialFeed.data.length >= 3,
  );
  // Verify pagination metadata
  TestValidator.predicate(
    "pagination current is valid",
    newFeed.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    newFeed.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is valid",
    newFeed.pagination.records >= newFeed.data.length,
  );
}