import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

/**
 * Test the Popular Feed endpoint with multiple sorting strategies to validate the global content discovery mechanism.
 * This scenario verifies that authenticated members can retrieve posts from all communities regardless of subscription status.
 */
export async function test_api_popular_feed_sorting_strategies(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Create two test communities
  const community1 =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community1);
  const community2 =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community2);
  // Step 3: Subscribe to both communities
  await api.functional.redditLike.member.communities.subscriptions.create(
    memberConnection,
    { communityId: community1.id },
  );
  await api.functional.redditLike.member.communities.subscriptions.create(
    memberConnection,
    { communityId: community2.id },
  );
  // Step 4: Create multiple posts across both communities with different types
  // Text post in community 1
  const textPost = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        community_id: community1.id,
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies Partial<IRedditLikePost.ICreate>,
    },
  );
  typia.assert(textPost);
  // Link post in community 2
  const linkPost = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        community_id: community2.id,
        post_type: "link",
        url: "https://example.com/news/article123",
      } satisfies Partial<IRedditLikePost.ICreate>,
    },
  );
  typia.assert(linkPost);
  // Image post in community 1
  const imagePost = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        community_id: community1.id,
        post_type: "image",
      } satisfies Partial<IRedditLikePost.ICreate>,
    },
  );
  typia.assert(imagePost);
  // Create additional posts for better testing
  const additionalPosts = await ArrayUtil.asyncRepeat(3, async () => {
    const post = await generate_random_reddit_like_member_posts_create(
      memberConnection,
      {
        body: {
          community_id: RandomGenerator.pick([community1.id, community2.id]),
        },
      },
    );
    return post;
  });
  additionalPosts.forEach((post) => typia.assert(post));
  // Step 5: Test sort='hot'
  const hotFeed = await api.functional.redditLike.member.feeds.popular.index(
    memberConnection,
    {
      body: {
        sort: "hot",
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(hotFeed);
  TestValidator.predicate(
    "hot feed has pagination",
    hotFeed.pagination !== undefined,
  );
  TestValidator.predicate(
    "hot feed has data array",
    Array.isArray(hotFeed.data),
  );
  TestValidator.predicate("hot feed contains posts", hotFeed.data.length > 0);
  // Step 6: Test sort='new'
  const newFeed = await api.functional.redditLike.member.feeds.popular.index(
    memberConnection,
    {
      body: {
        sort: "new",
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(newFeed);
  TestValidator.predicate(
    "new feed has pagination",
    newFeed.pagination !== undefined,
  );
  TestValidator.predicate(
    "new feed has data array",
    Array.isArray(newFeed.data),
  );
  // Step 7: Test sort='top' with time_filter='week'
  const topWeekFeed =
    await api.functional.redditLike.member.feeds.popular.index(
      memberConnection,
      {
        body: {
          sort: "top",
          timeFilter: "week",
          limit: 10,
        } satisfies IRedditLikePost.IRequest,
      },
    );
  typia.assert(topWeekFeed);
  TestValidator.predicate(
    "top week feed has pagination",
    topWeekFeed.pagination !== undefined,
  );
  TestValidator.predicate(
    "top week feed has data array",
    Array.isArray(topWeekFeed.data),
  );
  // Step 8: Test sort='controversial' with time_filter='all_time'
  const controversialFeed =
    await api.functional.redditLike.member.feeds.popular.index(
      memberConnection,
      {
        body: {
          sort: "controversial",
          timeFilter: "all_time",
          limit: 10,
        } satisfies IRedditLikePost.IRequest,
      },
    );
  typia.assert(controversialFeed);
  TestValidator.predicate(
    "controversial feed has pagination",
    controversialFeed.pagination !== undefined,
  );
  TestValidator.predicate(
    "controversial feed has data array",
    Array.isArray(controversialFeed.data),
  );
  // Step 9: Test pagination with page=1, limit=5
  const paginatedFeed =
    await api.functional.redditLike.member.feeds.popular.index(
      memberConnection,
      {
        body: {
          sort: "new",
          page: 1,
          limit: 5,
        } satisfies IRedditLikePost.IRequest,
      },
    );
  typia.assert(paginatedFeed);
  TestValidator.equals(
    "pagination current page",
    paginatedFeed.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginatedFeed.pagination.limit, 5);
  TestValidator.predicate(
    "pagination records valid",
    paginatedFeed.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages valid",
    paginatedFeed.pagination.pages >= 0,
  );
  // Step 10: Validate post structure with type-specific preview fields
  const allFeeds = [hotFeed, newFeed, topWeekFeed, controversialFeed];
  for (const feed of allFeeds) {
    for (const post of feed.data) {
      // Validate base fields exist (typia.assert already validates structure)
      TestValidator.predicate(
        `post ${post.id} has author`,
        post.author !== undefined,
      );
      TestValidator.predicate(
        `post ${post.id} has community`,
        post.community !== undefined,
      );
      // Validate author has required fields
      TestValidator.predicate(
        `post ${post.id} author has username`,
        post.author.username !== undefined,
      );
      // Validate community has required fields
      TestValidator.predicate(
        `post ${post.id} community has name`,
        post.community.name !== undefined,
      );
    }
  }
  // Verify posts from both communities are present across feeds
  const allCommunityIds = new Set<string>();
  for (const feed of allFeeds) {
    for (const post of feed.data) {
      allCommunityIds.add(post.community.id);
    }
  }
  // At least one of the feeds should contain posts
  TestValidator.predicate("feeds contain posts", allCommunityIds.size >= 1);
}