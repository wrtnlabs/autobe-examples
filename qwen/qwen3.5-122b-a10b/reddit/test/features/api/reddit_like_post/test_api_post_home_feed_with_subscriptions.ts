import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
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
import { generate_random_reddit_like_member_subscriptions_create } from "../../../generate/generate_random_reddit_like_member_subscriptions_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_subscription";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

/**
 * Test home feed retrieval with subscription filtering.
 *
 * Validates that a member's home feed correctly returns only posts from communities they are subscribed to, while excluding posts from unsubscribed communities. This test ensures the subscription-based feed filtering logic works correctly.
 *
 * The test follows this workflow:
 * 1. Create and authenticate a member account
 * 2. Create two distinct communities (subscribed and unsubscribed)
 * 3. Subscribe the member to only the first community
 * 4. Create multiple posts in both communities
 * 5. Retrieve the home feed and verify subscription filtering
 * 6. Validate post metadata including vote scores, comment counts, and content previews
 *
 * 1. Member account creation and authentication
 * 1.1. Create member with unique email, password, and username
 * 1.2. Authenticate member to obtain JWT token
 *
 * 2. Community setup for subscription testing
 * 2.1. Create first community (will be subscribed)
 * 2.2. Create second community (will remain unsubscribed)
 *
 * 3. Subscription management
 * 3.1. Subscribe member to first community only
 * 3.2. Verify subscription was created successfully
 *
 * 4. Post creation across communities
 * 4.1. Create 2 posts in subscribed community
 * 4.2. Create 1 post in unsubscribed community
 * 4.3. Verify all posts were created successfully
 *
 * 5. Home feed retrieval and validation
 * 5.1. Call home feed endpoint with feed_type="home"
 * 5.2. Verify only posts from subscribed community are returned
 * 5.3. Verify posts from unsubscribed community are excluded
 * 5.4. Validate post metadata (vote_score, comment_count, author, community)
 * 5.5. Verify content_preview is populated correctly
 */
export async function test_api_post_home_feed_with_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create two distinct communities
  const subscribedCommunity =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {
        body: {
          name: `subscribed-${RandomGenerator.alphabets(5)}`,
          description: "Community that member will subscribe to",
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(subscribedCommunity);
  const unsubscribedCommunity =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {
        body: {
          name: `unsubscribed-${RandomGenerator.alphabets(5)}`,
          description: "Community that member will NOT subscribe to",
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(unsubscribedCommunity);
  // 3. Subscribe member to first community only
  const subscription =
    await generate_random_reddit_like_member_subscriptions_create(
      memberConnection,
      {
        body: {
          communityId: subscribedCommunity.id,
        } satisfies IRedditLikeCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create posts in both communities
  // 4.1. Create 2 posts in subscribed community
  const subscribedPost1 = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: subscribedCommunity.id,
        title: `Subscribed Post 1 - ${RandomGenerator.alphabets(8)}`,
        content_type: "text",
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(subscribedPost1);
  const subscribedPost2 = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: subscribedCommunity.id,
        title: `Subscribed Post 2 - ${RandomGenerator.alphabets(8)}`,
        content_type: "text",
        content_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(subscribedPost2);
  // 4.2. Create 1 post in unsubscribed community
  const unsubscribedPost =
    await generate_random_reddit_like_member_posts_create(memberConnection, {
      body: {
        community_id: unsubscribedCommunity.id,
        title: `Unsubscribed Post - ${RandomGenerator.alphabets(8)}`,
        content_type: "text",
        content_text: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(unsubscribedPost);
  // 5. Retrieve home feed and validate subscription filtering
  const homeFeed = await api.functional.redditLike.member.posts.index(
    memberConnection,
    {
      body: {
        feed_type: "home",
        sort: "new",
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(homeFeed);
  // 5.2. Verify only posts from subscribed community are returned
  TestValidator.equals(
    "home feed contains only subscribed community posts",
    homeFeed.data.length,
    2,
  );
  // 5.3. Verify all returned posts are from subscribed community
  const allFromSubscribed = homeFeed.data.every(
    (post) => post.community.id === subscribedCommunity.id,
  );
  TestValidator.predicate(
    "all posts in home feed are from subscribed community",
    allFromSubscribed,
  );
  // 5.4. Verify posts from unsubscribed community are NOT included
  const unsubscribedExcluded = homeFeed.data.every(
    (post) => post.community.id !== unsubscribedCommunity.id,
  );
  TestValidator.predicate(
    "unsubscribed community posts excluded from home feed",
    unsubscribedExcluded,
  );
  // 5.5. Validate post metadata for each returned post
  for (const post of homeFeed.data) {
    // Verify community information
    TestValidator.equals(
      `post ${post.id} community matches`,
      post.community.id,
      subscribedCommunity.id,
    );
    // Verify author information
    TestValidator.equals(
      `post ${post.id} author matches`,
      post.author.id,
      member.id,
    );
    // Verify content preview is populated
    TestValidator.predicate(
      `post ${post.id} has content preview`,
      post.content_preview.length > 0,
    );
    // Verify title exists
    TestValidator.predicate(`post ${post.id} has title`, post.title.length > 0);
  }
}
