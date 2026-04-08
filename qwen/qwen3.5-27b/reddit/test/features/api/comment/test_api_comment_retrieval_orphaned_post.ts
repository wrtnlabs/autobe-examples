import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test retrieving a comment when the parent post has been deleted.
 *
 * Validates that orphaned comments (comments on deleted posts) are properly protected and cannot be accessed through the normal retrieval endpoint. Ensures the system handles deleted content gracefully by returning appropriate errors and preventing access to orphaned data.
 *
 * Special attention is given to verifying that when a post is deleted, all its comments become inaccessible and the API returns a clear error indicating the parent post no longer exists.
 *
 * 1. Create a member account with email, password, and username.
 * 2. Subscribe the member to a community to enable post creation.
 * 3. Create a post in the subscribed community.
 * 4. Create a comment on the post.
 * 5. Delete the parent post (which should cascade delete the comment).
 * 6. Attempt to retrieve the orphaned comment using the original post ID and comment ID.
 * 7. Validate that the retrieval fails with an appropriate error (404 Not Found).
 */
export async function test_api_comment_retrieval_orphaned_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      password: RandomGenerator.alphaNumeric(16),
      referrer: typia.random<string & tags.Format<"uri">>(),
      username: RandomGenerator.name(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. Subscribe to a community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {},
    );
  typia.assert(subscription);
  // 3. Create a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: subscription.community.id,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
        title: RandomGenerator.name(3),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create a comment on the post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCloneComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 5. Delete the parent post
  await api.functional.redditClone.member.posts.erase(memberConnection, {
    postId: post.id,
  });
  // 6. Attempt to retrieve the orphaned comment
  await TestValidator.error(
    "orphaned comment retrieval should fail",
    async () => {
      await api.functional.redditClone.posts.comments.at(memberConnection, {
        postId: post.id,
        commentId: comment.id,
      });
    },
  );
}
