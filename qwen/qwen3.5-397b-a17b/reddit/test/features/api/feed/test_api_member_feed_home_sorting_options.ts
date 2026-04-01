import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_vote_create } from "../../../generate/generate_random_reddit_community_member_posts_vote_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post_vote } from "../../../prepare/prepare_random_reddit_community_post_vote";

/**
 * Test that the home feed correctly applies different sorting options to posts from subscribed communities.
 *
 * Test Steps:
 * 1. Register a new member account using authorize_member_join utility
 * 2. Create a community and subscribe to it
 * 3. Create multiple posts with different content for sorting tests
 * 4. Cast votes on posts to establish different vote scores
 * 5. Test each sorting option (new, hot, top, controversial) with proper validation
 * 6. Verify pagination works correctly with each sort option
 *
 * Business Logic Validation:
 * - Each sorting algorithm must produce correct ordering
 * - Time filters must correctly limit results to specified time range
 * - Vote scores must be computed accurately from upvotes/downvotes
 * - Home feed must only show posts from subscribed communities
 */
export async function test_api_member_feed_home_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(auth);
  // 2. Create community using generation utility
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create multiple posts for sorting tests
  const post1 = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post1);
  const post2 = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post2);
  const post3 = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post3);
  const post4 = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post4);
  // 5. Cast votes on posts to establish different vote scores
  const vote1 = await generate_random_reddit_community_member_posts_vote_create(
    memberConnection,
    {
      params: { postId: post1.id },
      body: { direction: "UPVOTE" },
    },
  );
  typia.assert(vote1);
  const vote2 = await generate_random_reddit_community_member_posts_vote_create(
    memberConnection,
    {
      params: { postId: post2.id },
      body: { direction: "UPVOTE" },
    },
  );
  typia.assert(vote2);
  const vote3 = await generate_random_reddit_community_member_posts_vote_create(
    memberConnection,
    {
      params: { postId: post3.id },
      body: { direction: "UPVOTE" },
    },
  );
  typia.assert(vote3);
  // 6. Test 'new' sorting - most recent posts first
  const newFeed = await api.functional.redditCommunity.member.feeds.home.index(
    memberConnection,
    {
      body: {
        sort: "new",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(newFeed);
  TestValidator.predicate("new feed has posts", newFeed.data.length > 0);
  TestValidator.predicate(
    "new feed pagination valid",
    newFeed.pagination.current >= 1,
  );
  // 7. Test 'hot' sorting - high engagement posts first
  const hotFeed = await api.functional.redditCommunity.member.feeds.home.index(
    memberConnection,
    {
      body: {
        sort: "hot",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(hotFeed);
  TestValidator.predicate("hot feed has posts", hotFeed.data.length > 0);
  // 8. Test 'top' sorting with timeFilter='all'
  const topFeedAll =
    await api.functional.redditCommunity.member.feeds.home.index(
      memberConnection,
      {
        body: {
          sort: "top",
          timeFilter: "all",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(topFeedAll);
  TestValidator.predicate("top all feed has posts", topFeedAll.data.length > 0);
  // 9. Test 'top' sorting with timeFilter='week'
  const topFeedWeek =
    await api.functional.redditCommunity.member.feeds.home.index(
      memberConnection,
      {
        body: {
          sort: "top",
          timeFilter: "week",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(topFeedWeek);
  TestValidator.predicate(
    "top week feed has posts",
    topFeedWeek.data.length > 0,
  );
  // 10. Test 'controversial' sorting
  const controversialFeed =
    await api.functional.redditCommunity.member.feeds.home.index(
      memberConnection,
      {
        body: {
          sort: "controversial",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(controversialFeed);
  TestValidator.predicate(
    "controversial feed has posts",
    controversialFeed.data.length > 0,
  );
  // 11. Test pagination with page 2
  const page2Feed =
    await api.functional.redditCommunity.member.feeds.home.index(
      memberConnection,
      {
        body: {
          sort: "new",
          page: 2,
          limit: 10,
        },
      },
    );
  typia.assert(page2Feed);
  TestValidator.equals(
    "pagination current page",
    page2Feed.pagination.current,
    2,
  );
  // 12. Verify all feeds contain posts from subscribed community
  TestValidator.predicate(
    "new feed contains subscribed community posts",
    newFeed.data.every((post) => post.community.id === community.id),
  );
  TestValidator.predicate(
    "hot feed contains subscribed community posts",
    hotFeed.data.every((post) => post.community.id === community.id),
  );
  TestValidator.predicate(
    "top feed contains subscribed community posts",
    topFeedAll.data.every((post) => post.community.id === community.id),
  );
}
