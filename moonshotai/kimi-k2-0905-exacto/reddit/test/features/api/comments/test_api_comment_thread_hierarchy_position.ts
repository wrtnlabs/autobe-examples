import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test thread depth positioning for individual comments to validate
 * Reddit-style comment hierarchy. This test verifies that `thread_depth`
 * accurately represents a comment's nesting level (0 for top-level,
 * incrementing for replies) and that parent-child relationships are correctly
 * maintained in the comment tree structure.
 *
 * Business context: Reddit communities rely on threaded discussions where
 * comments form hierarchical trees. Thread depth tracking is essential for
 * proper UI display, navigation, and maintaining conversation flow within
 * nested reply structures.
 */
export async function test_api_comment_thread_hierarchy_position(
  connection: api.IConnection,
) {
  // Test 1: Top-level comment (thread_depth = 0)
  const topLevelPostId = typia.random<string & tags.Format<"uuid">>();
  const topLevelCommentId = typia.random<string & tags.Format<"uuid">>();

  const topLevelComment =
    await api.functional.redditCommunity.posts.comments.at(connection, {
      postId: topLevelPostId,
      commentId: topLevelCommentId,
    });

  // Validate top-level comment structure
  typia.assert(topLevelComment);

  TestValidator.equals(
    "top-level comment has depth 0",
    topLevelComment.thread_depth,
    0,
  );

  TestValidator.equals(
    "top-level comment has no parent",
    topLevelComment.parent_comment,
    null,
  );

  // Test 2: Nested reply comment (thread_depth >= 1)
  const nestedPostId = typia.random<string & tags.Format<"uuid">>();
  const nestedCommentId = typia.random<string & tags.Format<"uuid">>();

  const nestedComment = await api.functional.redditCommunity.posts.comments.at(
    connection,
    {
      postId: nestedPostId,
      commentId: nestedCommentId,
    },
  );

  typia.assert(nestedComment);

  TestValidator.predicate(
    "nested comment has depth > 0",
    nestedComment.thread_depth > 0,
  );

  TestValidator.predicate(
    "nested comment has parent reference",
    nestedComment.parent_comment !== null &&
      nestedComment.parent_comment !== undefined &&
      typia.is<IRedditCommunityComment.ISummary>(nestedComment.parent_comment),
  );

  // Test 3: Deep nested comment (thread_depth >= 2)
  const deepPostId = typia.random<string & tags.Format<"uuid">>();
  const deepCommentId = typia.random<string & tags.Format<"uuid">>();

  const deepComment = await api.functional.redditCommunity.posts.comments.at(
    connection,
    {
      postId: deepPostId,
      commentId: deepCommentId,
    },
  );

  typia.assert(deepComment);

  TestValidator.predicate(
    "deep nested comment has depth >= 2",
    deepComment.thread_depth >= 2,
  );

  // Validate that deep comments maintain proper parent-child relationships
  if (deepComment.parent_comment) {
    TestValidator.predicate(
      "parent comment of deep nested comment has lower depth",
      deepComment.parent_comment.thread_depth < deepComment.thread_depth,
    );

    TestValidator.predicate(
      "depth increases by exactly 1 from parent",
      deepComment.thread_depth === deepComment.parent_comment.thread_depth + 1,
    );
  }

  // Test 4: Common validation for all comment types
  const allComments = [topLevelComment, nestedComment, deepComment];

  for (const comment of allComments) {
    // Validate thread depth is non-negative integer
    TestValidator.predicate(
      "thread_depth is valid integer >= 0",
      Number.isInteger(comment.thread_depth) && comment.thread_depth >= 0,
    );

    // Validate vote counts are non-negative
    TestValidator.predicate(
      "upvote count is non-negative integer",
      Number.isInteger(comment.upvote_count) && comment.upvote_count >= 0,
    );

    TestValidator.predicate(
      "downvote count is non-negative integer",
      Number.isInteger(comment.downvote_count) && comment.downvote_count >= 0,
    );

    // Validate required references
    TestValidator.predicate(
      "comment has valid author reference",
      comment.author !== null &&
        comment.author !== undefined &&
        typia.is<IRedditCommunityMember.ISummary>(comment.author),
    );

    TestValidator.predicate(
      "comment has valid post reference",
      comment.post !== null &&
        comment.post !== undefined &&
        typia.is<IRedditCommunityPost.ISummary>(comment.post),
    );

    // Validate datetime formatting
    TestValidator.predicate(
      "created_at is valid ISO date-time format",
      new Date(comment.created_at).toISOString() === comment.created_at,
    );

    // Validate optional updated_at field
    if (comment.updated_at !== null && comment.updated_at !== undefined) {
      TestValidator.predicate(
        "updated_at is valid ISO date-time format when present",
        new Date(comment.updated_at).toISOString() === comment.updated_at,
      );
    }

    // Validate boolean status flags
    TestValidator.predicate(
      "is_deleted is boolean",
      typeof comment.is_deleted === "boolean",
    );

    TestValidator.predicate(
      "is_removed is boolean",
      typeof comment.is_removed === "boolean",
    );

    // Content validation
    TestValidator.predicate(
      "content is non-empty string",
      typeof comment.content === "string" && comment.content.length > 0,
    );

    TestValidator.predicate(
      "content length is reasonable",
      comment.content.length <= 10000,
    );

    // Summary validation for nested references
    if (
      comment.parent_comment !== null &&
      comment.parent_comment !== undefined
    ) {
      TestValidator.predicate(
        "parent comment has valid summary structure",
        typia.is<IRedditCommunityComment.ISummary>(comment.parent_comment),
      );

      TestValidator.predicate(
        "parent comment has valid depth reference",
        Number.isInteger(comment.parent_comment.thread_depth) &&
          comment.parent_comment.thread_depth >= 0,
      );
    }
  }
}
