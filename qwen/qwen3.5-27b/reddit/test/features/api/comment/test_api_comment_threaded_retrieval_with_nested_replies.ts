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
 * Test retrieving a comment with its complete threaded reply structure.
 *
 * Validates the complete comment thread retrieval flow including member authentication, community subscription, post creation, and multi-level nested comment creation. Ensures that the threaded comment structure is correctly maintained with proper parent-child relationships, vote scores, and author information at all nesting depths.
 *
 * Special attention is given to verifying that the parentComment field is null for top-level comments, correctly references parent comments for replies, and that the replies array recursively contains all nested child comments with their own reply structures.
 *
 * 1. Member registers and authenticates with email, password, and username.
 * 2. Member subscribes to a community to enable post creation.
 * 3. Member creates a post in the subscribed community.
 * 4. Member creates a top-level comment on the post.
 * 5. Member creates a first-level reply to the top-level comment.
 * 6. Member creates a second-level reply to the first-level reply.
 * 7. Member creates another first-level reply to test multiple siblings.
 * 8. Retrieves the top-level comment with complete threaded structure.
 * 9. Validates the thread hierarchy, parent references, and nested replies.
 */
export async function test_api_comment_threaded_retrieval_with_nested_replies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
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
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        community_id: subscription.community.id,
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create a top-level comment on the post
  const topLevelComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          parentCommentId: null,
        } satisfies IRedditCloneComment.ICreate,
      },
    );
  typia.assert(topLevelComment);
  // 5. Create a first-level reply to the top-level comment
  const firstLevelReply1 =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parentCommentId: topLevelComment.id,
        } satisfies IRedditCloneComment.ICreate,
      },
    );
  typia.assert(firstLevelReply1);
  // 6. Create a second-level reply to the first-level reply
  const secondLevelReply1 =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parentCommentId: firstLevelReply1.id,
        } satisfies IRedditCloneComment.ICreate,
      },
    );
  typia.assert(secondLevelReply1);
  // 7. Create another first-level reply to test multiple siblings
  const firstLevelReply2 =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parentCommentId: topLevelComment.id,
        } satisfies IRedditCloneComment.ICreate,
      },
    );
  typia.assert(firstLevelReply2);
  // 8. Retrieve the top-level comment with complete threaded structure
  const retrievedComment = await api.functional.redditClone.posts.comments.at(
    memberConnection,
    {
      postId: post.id,
      commentId: topLevelComment.id,
    },
  );
  typia.assert(retrievedComment);
  // 9. Validate the thread hierarchy
  // Validate top-level comment properties
  TestValidator.equals(
    "comment id matches",
    retrievedComment.id,
    topLevelComment.id,
  );
  TestValidator.equals(
    "comment content matches",
    retrievedComment.content,
    topLevelComment.content,
  );
  TestValidator.equals(
    "author matches",
    retrievedComment.author.id,
    topLevelComment.author.id,
  );
  TestValidator.equals("post matches", retrievedComment.post.id, post.id);
  TestValidator.equals(
    "parentComment is null for top-level",
    retrievedComment.parentComment,
    null,
  );
  // Validate replies array contains both first-level replies
  TestValidator.predicate("has replies", retrievedComment.replies.length >= 2);
  // Find the first-level reply that has a nested reply
  const replyWithNested = retrievedComment.replies.find(
    (r) => r.id === firstLevelReply1.id,
  );
  TestValidator.predicate(
    "first-level reply 1 found",
    replyWithNested !== undefined,
  );
  // Validate first-level reply properties
  TestValidator.equals(
    "reply id matches",
    replyWithNested!.id,
    firstLevelReply1.id,
  );
  TestValidator.equals(
    "reply content matches",
    replyWithNested!.content,
    firstLevelReply1.content,
  );
  TestValidator.equals(
    "reply parentComment references top-level",
    replyWithNested!.parentComment?.id,
    topLevelComment.id,
  );
  // Validate second-level reply exists
  TestValidator.predicate(
    "has nested replies",
    replyWithNested!.replies.length >= 1,
  );
  const nestedReply = replyWithNested!.replies.find(
    (r) => r.id === secondLevelReply1.id,
  );
  TestValidator.predicate(
    "second-level reply found",
    nestedReply !== undefined,
  );
  // Validate second-level reply properties
  TestValidator.equals(
    "nested reply id matches",
    nestedReply!.id,
    secondLevelReply1.id,
  );
  TestValidator.equals(
    "nested reply content matches",
    nestedReply!.content,
    secondLevelReply1.content,
  );
  TestValidator.equals(
    "nested reply parentComment references first-level",
    nestedReply!.parentComment?.id,
    firstLevelReply1.id,
  );
  TestValidator.equals(
    "nested reply has no further replies",
    nestedReply!.replies.length,
    0,
  );
  // Validate the second first-level reply (sibling without nested replies)
  const replyWithoutNested = retrievedComment.replies.find(
    (r) => r.id === firstLevelReply2.id,
  );
  TestValidator.predicate(
    "first-level reply 2 found",
    replyWithoutNested !== undefined,
  );
  // Validate sibling reply properties
  TestValidator.equals(
    "sibling reply id matches",
    replyWithoutNested!.id,
    firstLevelReply2.id,
  );
  TestValidator.equals(
    "sibling reply parentComment references top-level",
    replyWithoutNested!.parentComment?.id,
    topLevelComment.id,
  );
  TestValidator.equals(
    "sibling reply has no nested replies",
    replyWithoutNested!.replies.length,
    0,
  );
  // Validate vote scores are initialized correctly
  TestValidator.predicate(
    "top-level comment has valid score",
    typeof retrievedComment.score === "number",
  );
  TestValidator.predicate(
    "first-level reply 1 has valid score",
    typeof replyWithNested!.score === "number",
  );
  TestValidator.predicate(
    "second-level reply has valid score",
    typeof nestedReply!.score === "number",
  );
}