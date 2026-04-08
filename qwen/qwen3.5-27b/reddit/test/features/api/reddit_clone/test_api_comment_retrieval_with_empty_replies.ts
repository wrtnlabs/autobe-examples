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
 * Test retrieving a comment that has no replies.
 *
 * Validates the complete comment retrieval flow including member authentication, community subscription, post creation, and comment creation without any nested replies. Ensures that the comment response structure correctly represents a top-level comment with an empty replies array.
 *
 * Special attention is given to verifying that the parentComment field is null for top-level comments and that the replies array is present but empty, confirming proper handling of comments without nested content.
 *
 * 1. Member joins the system with email, password, and username.
 * 2. Member subscribes to a community to enable post creation.
 * 3. Member creates a post in the subscribed community.
 * 4. Member creates a top-level comment on the post (no parentCommentId).
 * 5. Retrieves the comment using GET /redditClone/posts/{postId}/comments/{commentId}.
 * 6. Validates comment structure, content, author info, timestamps, and empty replies array.
 */
export async function test_api_comment_retrieval_with_empty_replies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
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
      },
    },
  );
  typia.assert(post);
  // 4. Create a top-level comment on the post (no parentCommentId)
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {},
      },
    );
  typia.assert(comment);
  // 5. Retrieve the comment with empty replies
  const retrievedComment = await api.functional.redditClone.posts.comments.at(
    memberConnection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  typia.assert(retrievedComment);
  // 6. Validate comment structure
  TestValidator.equals("comment id matches", retrievedComment.id, comment.id);
  TestValidator.equals(
    "comment content matches",
    retrievedComment.content,
    comment.content,
  );
  TestValidator.equals(
    "author matches",
    retrievedComment.author.id,
    comment.author.id,
  );
  TestValidator.equals("post matches", retrievedComment.post.id, post.id);
  TestValidator.equals(
    "parentComment is null for top-level",
    retrievedComment.parentComment,
    null,
  );
  TestValidator.equals(
    "replies array is empty",
    retrievedComment.replies.length,
    0,
  );
  TestValidator.predicate(
    "score is 0 for no votes",
    retrievedComment.score === 0,
  );
  TestValidator.predicate(
    "created_at exists",
    retrievedComment.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedComment.updated_at !== null,
  );
}
