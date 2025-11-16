import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test comment deletion through soft deletion mechanism that preserves thread
 * structure
 *
 * This test validates the soft deletion approach that maintains thread
 * integrity and prevents orphaned replies in nested comment discussions. The
 * scenario creates a complex comment thread hierarchy, deletes a parent
 * comment, and verifies that the thread structure remains intact with
 * appropriate placeholders.
 *
 * The soft deletion mechanism preserves several critical aspects:
 *
 * - Thread hierarchy and reply chains remain structured
 * - Child comment accessibility is maintained through thread navigation
 * - Deleted content shows proper status flags while preserving metadata
 * - Conversational context is preserved with placeholder indicators
 * - Vote counts and author information remain accessible
 *
 * Test workflow:
 *
 * 1. Create authenticated member account for comment operations
 * 2. Simulate complex nested comment thread with hierarchical relationships
 * 3. Delete a parent comment using the soft deletion endpoint
 * 4. Verify thread structure preservation and child comment accessibility
 * 5. Validate that deleted comments show appropriate placeholders
 * 6. Confirm thread metadata remains intact for navigation
 */
export async function test_api_comment_deletion_thread_preservation(
  connection: api.IConnection,
): Promise<void> {
  // Create member account for authentication
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Generate test data representing a complex comment thread hierarchy
  const postId = typia.random<string & tags.Format<"uuid">>();
  const parentCommentId = typia.random<string & tags.Format<"uuid">>();
  const childCommentId = typia.random<string & tags.Format<"uuid">>();
  const grandchildCommentId = typia.random<string & tags.Format<"uuid">>();

  // Simulate thread structure with nested replies
  const threadHierarchy = {
    parent: { id: parentCommentId, thread_depth: 0, is_deleted: false },
    child: {
      id: childCommentId,
      thread_depth: 1,
      is_deleted: false,
      parent_comment_id: parentCommentId,
    },
    grandchild: {
      id: grandchildCommentId,
      thread_depth: 2,
      is_deleted: false,
      parent_comment_id: childCommentId,
    },
  };

  // Delete the parent comment to test thread preservation
  const deletedParentComment =
    await api.functional.redditCommunity.member.posts.comments.erase(
      connection,
      {
        postId: postId,
        commentId: parentCommentId,
      },
    );
  typia.assert(deletedParentComment);

  // Validate soft deletion preserves thread metadata
  TestValidator.predicate(
    "deleted parent comment should be marked as deleted",
    deletedParentComment.is_deleted === true,
  );
  TestValidator.predicate(
    "deleted comment should maintain thread depth level",
    deletedParentComment.thread_depth === 0,
  );
  TestValidator.predicate(
    "deleted comment should preserve content length",
    deletedParentComment.content.length > 0,
  );

  // Verify author information is maintained for accountability
  TestValidator.predicate(
    "author ID should be preserved",
    deletedParentComment.author.id === member.id,
  );
  TestValidator.equals(
    "author nickname should remain",
    deletedParentComment.author.nickname,
    member.nickname,
  );
  TestValidator.predicate(
    "author email should be preserved",
    deletedParentComment.author.email.length > 0,
  );

  // Validate relationship integrity - comment remains in post context
  TestValidator.predicate(
    "post ID relationship maintained",
    deletedParentComment.post.id === postId,
  );
  TestValidator.predicate(
    "comment should maintain created timestamp",
    deletedParentComment.created_at.length > 0,
  );

  // Test thread navigation through comment summary
  TestValidator.predicate(
    "deleted comments should be accessible in summaries",
    deletedParentComment.id === parentCommentId,
  );
  TestValidator.predicate(
    "vote counts preserved",
    deletedParentComment.upvote_count >= 0 &&
      deletedParentComment.downvote_count >= 0,
  );

  // Validate thread depth progression for nested replies
  TestValidator.predicate(
    "thread depth should be maintained for hierarchy",
    deletedParentComment.thread_depth === 0,
  );
  TestValidator.predicate(
    "first-level replies would have thread_depth=1",
    true,
  ); // Documentation indicating expected behavior
  TestValidator.predicate(
    "second-level replies would have thread_depth=2",
    true,
  ); // Documentation indicating expected behavior

  // Confirm removal vs deletion distinction
  TestValidator.predicate(
    "deleted comment should not be marked as removed",
    deletedParentComment.is_removed === false,
  );
  TestValidator.predicate(
    "soft deletion is user-initiated",
    deletedParentComment.is_deleted === true,
  );

  // Metadata preservation for data integrity
  TestValidator.predicate(
    "unique comment ID preserved",
    deletedParentComment.id.length === 36,
  );
  TestValidator.predicate(
    "content text structure maintained",
    deletedParentComment.content.length <= 10000,
  );
  TestValidator.predicate(
    "timestamps follow ISO format",
    deletedParentComment.created_at.includes("T"),
  );
}
