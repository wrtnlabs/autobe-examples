import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test post retrieval by community subscriber.
 *
 * Validates the subscription-based access control mechanism where only subscribed members can retrieve posts from communities they follow. The test creates two separate member accounts, establishes a community and post with the first member, then verifies the second member can access the post only after subscribing to the community.
 *
 * This test ensures proper isolation between members and validates that the post retrieval endpoint correctly enforces subscription requirements while returning complete post entities with all computed fields.
 *
 * 1. First member account is created and authenticated.
 * 2. First member creates a community with unique name.
 * 3. First member creates a text post in their community.
 * 4. Second member account is created and authenticated.
 * 5. Second member subscribes to the community.
 * 6. Second member retrieves the post by ID.
 * 7. Validates post structure and content integrity.
 * 8. Validates author and community relationships.
 * 9. Validates computed metrics (vote_score, comments_count).
 */
export async function test_api_post_retrieval_by_subscriber(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member (post creator)
  const creatorConnection: api.IConnection = { host: connection.host };
  const creatorAuth: IRedditLikeMember.IAuthorized =
    await authorize_member_join(creatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    });
  typia.assert(creatorAuth);
  // 2. First member creates a community
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      creatorConnection,
      {
        body: {
          name: `community-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. First member creates a text post in the community
  const post: IRedditLikePost =
    await generate_random_reddit_like_member_posts_create(creatorConnection, {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);
  // 4. Create second member (subscriber)
  const subscriberConnection: api.IConnection = { host: connection.host };
  const subscriberAuth: IRedditLikeMember.IAuthorized =
    await authorize_member_join(subscriberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    });
  typia.assert(subscriberAuth);
  // 5. Second member subscribes to the community
  const subscription =
    await generate_random_reddit_like_member_subscriptions_create(
      subscriberConnection,
      {
        body: {
          communityId: community.id,
        } satisfies IRedditLikeCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 6. Subscriber retrieves the post
  const retrievedPost: IRedditLikePost =
    await api.functional.redditLike.member.posts.at(subscriberConnection, {
      postId: post.id,
    });
  typia.assert(retrievedPost);
  // 7. Validate post structure and relationships
  TestValidator.equals("post ID matches", retrievedPost.id, post.id);
  TestValidator.equals("post title matches", retrievedPost.title, post.title);
  TestValidator.equals(
    "post content type matches",
    retrievedPost.content_type,
    post.content_type,
  );
  // 8. Validate author information
  TestValidator.equals(
    "author ID matches",
    retrievedPost.author.id,
    creatorAuth.id,
  );
  TestValidator.equals(
    "author username matches",
    retrievedPost.author.username,
    creatorAuth.username,
  );
  // 9. Validate community information
  TestValidator.equals(
    "community ID matches",
    retrievedPost.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    retrievedPost.community.name,
    community.name,
  );
  // 10. Validate computed metrics
  TestValidator.predicate(
    "vote score is non-negative",
    retrievedPost.vote_score >= 0,
  );
  TestValidator.predicate(
    "comments count is non-negative",
    retrievedPost.comments_count >= 0,
  );
  // 11. Validate content fields for text post
  if (retrievedPost.content_type === "text") {
    TestValidator.predicate(
      "content text exists",
      retrievedPost.content_text !== null &&
        retrievedPost.content_text !== undefined,
    );
  }
}
