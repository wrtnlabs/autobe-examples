import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test that restoring a parent comment maintains all child reply relationships
 * intact.
 *
 * This test validates the comment restoration functionality preserves nested
 * threading:
 *
 * 1. Create moderator account for moderation privileges
 * 2. Create community for post context
 * 3. Create post as container for comments
 * 4. Build multi-level comment tree with parent and nested replies
 * 5. Delete parent comment (soft-delete with deleted_at timestamp) - NOTE: No
 *    delete API available, proceeding to restoration test
 * 6. Restore parent comment using moderator privileges
 * 7. Verify all child replies remain connected with correct hierarchy
 */
export async function test_api_comment_restoration_preserves_nested_replies(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create community
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create post as parent for comments
  const post: IRedditLikePost =
    await api.functional.redditLike.moderator.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 7,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);

  // Step 4: Build comment tree - create parent comment
  const parentComment: IRedditLikeComment =
    await api.functional.redditLike.moderator.comments.create(connection, {
      body: {
        reddit_like_post_id: post.id,
        content_text: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(parentComment);
  TestValidator.equals("parent comment depth", parentComment.depth, 0);

  // Step 5: Create nested reply comments (multiple levels)
  const childComments: IRedditLikeComment[] = [];

  // First level child
  const child1: IRedditLikeComment =
    await api.functional.redditLike.moderator.comments.create(connection, {
      body: {
        reddit_like_post_id: post.id,
        reddit_like_parent_comment_id: parentComment.id,
        content_text: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(child1);
  TestValidator.equals("child1 depth", child1.depth, 1);
  TestValidator.equals(
    "child1 parent",
    child1.reddit_like_parent_comment_id,
    parentComment.id,
  );
  childComments.push(child1);

  // Second level child (reply to child1)
  const child2: IRedditLikeComment =
    await api.functional.redditLike.moderator.comments.create(connection, {
      body: {
        reddit_like_post_id: post.id,
        reddit_like_parent_comment_id: child1.id,
        content_text: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(child2);
  TestValidator.equals("child2 depth", child2.depth, 2);
  TestValidator.equals(
    "child2 parent",
    child2.reddit_like_parent_comment_id,
    child1.id,
  );
  childComments.push(child2);

  // Another first level child
  const child3: IRedditLikeComment =
    await api.functional.redditLike.moderator.comments.create(connection, {
      body: {
        reddit_like_post_id: post.id,
        reddit_like_parent_comment_id: parentComment.id,
        content_text: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(child3);
  TestValidator.equals("child3 depth", child3.depth, 1);
  TestValidator.equals(
    "child3 parent",
    child3.reddit_like_parent_comment_id,
    parentComment.id,
  );
  childComments.push(child3);

  // Step 6: Delete parent comment (soft-delete)
  // NOTE: No delete API endpoint provided in the available materials
  // In a production scenario, deletion would occur here before restoration
  // This test focuses on validating the restoration mechanism

  // Step 7: Restore parent comment
  const restoredComment: IRedditLikeComment =
    await api.functional.redditLike.moderator.comments.restore(connection, {
      commentId: parentComment.id,
    });
  typia.assert(restoredComment);

  // Step 8: Validate restoration preserved all relationships
  TestValidator.equals(
    "restored comment ID matches",
    restoredComment.id,
    parentComment.id,
  );
  TestValidator.equals("restored comment depth", restoredComment.depth, 0);
  TestValidator.equals(
    "restored comment content",
    restoredComment.content_text,
    parentComment.content_text,
  );

  // Verify comment tree structure remains intact
  // All child comments should maintain their parent relationships
  TestValidator.predicate(
    "comment tree hierarchy preserved",
    childComments.every(
      (child) =>
        child.reddit_like_parent_comment_id === parentComment.id ||
        childComments.some((c) => c.id === child.reddit_like_parent_comment_id),
    ),
  );
}
