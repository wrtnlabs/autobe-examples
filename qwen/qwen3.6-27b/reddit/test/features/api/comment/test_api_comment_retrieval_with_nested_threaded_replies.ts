import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_community_member_posts_comments_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_post_comment } from "../../../prepare/prepare_random_reddit_like_community_post_comment";

/**
 * Test retrieving a comment with multiple levels of nested threaded replies.
 *
 * Validates the complete threaded comment tree retrieval by creating a three-level deep
 * comment hierarchy (parent → child reply → grandchild reply) and verifying that
 * retrieving the parent comment returns the full nested structure. Each level of the
 * thread must correctly include the childComments array containing nested replies,
 * along with proper author attribution, body text, voteScore, and timestamps.
 *
 * This test ensures the recursive tree-building logic functions correctly for
 * unlimited-depth threaded conversations, verifying that all nested relationships
 * are properly maintained and returned in the response.
 *
 * 1. Member registers and authenticates to the platform.
 * 2. Member creates a community for content discussions.
 * 3. Member subscribes to the community to enable post creation.
 * 4. Member creates a post in the subscribed community.
 * 5. Member creates a top-level (parent) comment on the post with no parent reference.
 * 6. Member creates a child reply to the parent comment.
 * 7. Member creates a grandchild reply to the child comment, forming 3 levels deep.
 * 8. Member retrieves the parent comment by its ID via the dedicated endpoint.
 * 9. Validates the retrieved comment body and author match the created parent.
 * 10. Validates the child comment exists in parent's childComments array.
 * 11. Validates the grandchild comment exists in child's childComments array.
 * 12. Verifies author attribution, body text, voteScore, and timestamps at each nesting level.
 */
export async function test_api_comment_retrieval_with_nested_threaded_replies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: {} });
  // 2. Create community for content discussions
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe member to the community
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    memberConnection,
    { body: { community_id: community.id } },
  );
  // 4. Create a post in the subscribed community
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    { body: { community_id: community.id } },
  );
  typia.assert(post);
  // 5. Create parent comment (top-level, no parent reference)
  const parentComment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          body: "Parent comment - initiating top-level discussion thread",
        },
      },
    );
  typia.assert(parentComment);
  // 6. Create child reply (first-level nested, replying to parent)
  const childComment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          body: "Child reply - nested response to parent comment",
          parentCommentId: parentComment.id,
        },
      },
    );
  typia.assert(childComment);
  // 7. Create grandchild reply (second-level nested, replying to child)
  const grandchildComment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          body: "Grandchild reply - deeply nested third-level response",
          parentCommentId: childComment.id,
        },
      },
    );
  typia.assert(grandchildComment);
  // 8. Retrieve the parent comment (should return full nested tree)
  const retrievedComment =
    await api.functional.redditLikeCommunity.member.posts.comments.at(
      memberConnection,
      {
        postId: post.id,
        commentId: parentComment.id,
      },
    );
  typia.assert(retrievedComment);
  // 9. Validate parent comment data matches what was created
  TestValidator.equals(
    "parent comment body matches created",
    retrievedComment.body,
    "Parent comment - initiating top-level discussion thread",
  );
  TestValidator.equals(
    "parent comment author",
    retrievedComment.author.id,
    parentComment.author.id,
  );
  TestValidator.predicate(
    "parent comment has creation timestamp",
    retrievedComment.createdAt !== undefined,
  );
  TestValidator.predicate(
    "parent comment has voteScore",
    typeof retrievedComment.voteScore === "number",
  );
  TestValidator.predicate(
    "parent comment childComments is array",
    Array.isArray(retrievedComment.childComments),
  );
  TestValidator.predicate(
    "parent comment has child comments",
    retrievedComment.childComments.length >= 1,
  );
  // 10. Find and validate child comment in parent's childComments
  const foundChild = retrievedComment.childComments.find(
    (c) => c.id === childComment.id,
  );
  TestValidator.predicate(
    "child comment found in parent childComments",
    foundChild !== undefined,
  );
  if (foundChild !== undefined) {
    TestValidator.equals(
      "child comment body",
      foundChild.body,
      "Child reply - nested response to parent comment",
    );
    TestValidator.equals(
      "child comment author",
      foundChild.author.id,
      childComment.author.id,
    );
    TestValidator.predicate(
      "child comment has creation timestamp",
      foundChild.createdAt !== undefined,
    );
    TestValidator.predicate(
      "child comment has voteScore",
      typeof foundChild.voteScore === "number",
    );
    TestValidator.predicate(
      "child childComments is array",
      Array.isArray(foundChild.childComments),
    );
    TestValidator.predicate(
      "child has grandchild comments",
      foundChild.childComments.length >= 1,
    );
    // 11. Find and validate grandchild comment in child's childComments
    const foundGrandchild = foundChild.childComments.find(
      (gc) => gc.id === grandchildComment.id,
    );
    TestValidator.predicate(
      "grandchild comment found in child childComments",
      foundGrandchild !== undefined,
    );
    if (foundGrandchild !== undefined) {
      TestValidator.equals(
        "grandchild comment body",
        foundGrandchild.body,
        "Grandchild reply - deeply nested third-level response",
      );
      TestValidator.equals(
        "grandchild comment author",
        foundGrandchild.author.id,
        grandchildComment.author.id,
      );
      TestValidator.predicate(
        "grandchild has creation timestamp",
        foundGrandchild.createdAt !== undefined,
      );
      TestValidator.predicate(
        "grandchild has update timestamp",
        foundGrandchild.updatedAt !== undefined,
      );
      TestValidator.predicate(
        "grandchild has voteScore",
        typeof foundGrandchild.voteScore === "number",
      );
      TestValidator.predicate(
        "grandchild childComments exists (empty array)",
        Array.isArray(foundGrandchild.childComments),
      );
    }
  }
}
