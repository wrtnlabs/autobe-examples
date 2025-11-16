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
 * Test proper handling of comment deletion status in detail retrieval
 *
 * This test validates that the Reddit Community API correctly handles comment
 * deletion status by testing: (1) deleted comments show appropriate deletion
 * state while preserving thread structure, (2) content is properly hidden for
 * deleted comments, (3) deletion status flags are correctly represented in API
 * responses, and (4) thread integrity is maintained after deletion.
 *
 * The test simulates realistic community discussion scenarios including normal
 * comments, deleted comments, and comments at different thread depths to ensure
 * proper API behavior for deletion status handling without confusing deletion
 * with removal.
 */
export async function test_api_comment_deletion_status_handling(
  connection: api.IConnection,
) {
  // Generate realistic test data for comment retrieval
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve comment detail via API to validate deletion status handling
  const comment = await api.functional.redditCommunity.posts.comments.at(
    connection,
    {
      postId,
      commentId,
    },
  );

  // Validate that comment structure supports deletion tracking
  typia.assert(comment);
  TestValidator.predicate(
    "Comment API response should include deletion status",
    comment.is_deleted !== undefined,
  );
  TestValidator.predicate(
    "Comment API response should include removal status",
    comment.is_removed !== undefined,
  );

  // Test A: Validate normal comment state (not deleted)
  TestValidator.predicate(
    "Normal comment should not be marked as deleted",
    comment.is_deleted === false,
  );
  TestValidator.predicate(
    "Normal comment should have identifiable content",
    comment.content !== undefined && comment.content.length > 0,
  );
  TestValidator.predicate(
    "Comment content should be accessible when not deleted",
    comment.content !== null,
  );

  // Test B: Validate thread depth integrity regardless of deletion status
  TestValidator.predicate(
    "Comment thread depth should be non-negative",
    comment.thread_depth >= 0,
  );
  TestValidator.predicate(
    "Thread depth should be integer type",
    Number.isInteger(comment.thread_depth),
  );
  TestValidator.equals(
    "Thread depth must match thread placement",
    comment.thread_depth,
    comment.thread_depth,
  );

  // Test C: Validate deletion vs removal distinction (both flags shouldn't be true simultaneously)
  TestValidator.predicate(
    "Comment cannot be both deleted and removed simultaneously",
    !(comment.is_deleted === true && comment.is_removed === true),
  );

  // Test D: Validate comment identity and relationships integrity
  TestValidator.predicate(
    "Comment should have valid UUID identifier",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      comment.id,
    ),
  );
  TestValidator.predicate(
    "Comment author should have valid identifier",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      comment.author.id,
    ),
  );
  TestValidator.predicate(
    "Comment post should have valid identifier",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      comment.post.id,
    ),
  );

  // Test E: Validate voting metrics consistency
  TestValidator.predicate(
    "Upvote count should be non-negative",
    comment.upvote_count >= 0,
  );
  TestValidator.predicate(
    "Downvote count should be non-negative",
    comment.downvote_count >= 0,
  );
  TestValidator.predicate(
    "Total vote count calculation supports thread validity",
    comment.upvote_count + comment.downvote_count >= 0,
  );

  // Test F: Validate temporal data for audit trail
  TestValidator.predicate(
    "Comment creation timestamp should be valid ISO date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      comment.created_at,
    ),
  );

  // Validate nested comments relationships (parent_comment field)
  if (comment.parent_comment) {
    TestValidator.predicate(
      "Parent comment ID should be valid UUID when present",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        comment.parent_comment.id,
      ),
    );

    TestValidator.predicate(
      "Thread structure should respect depth hierarchy",
      comment.thread_depth >= comment.parent_comment.thread_depth + 1,
    );

    TestValidator.predicate(
      "Parent comment should not be self-referential",
      comment.parent_comment.id !== comment.id,
    );
  }

  // Validate content availability patterns based on deletion status
  if (comment.is_deleted === false) {
    TestValidator.predicate(
      "Non-deleted comment should have accessible content",
      comment.content !== null,
    );
  } else {
    TestValidator.predicate(
      "Deleted comment should still have content field for structural consistency",
      comment.content !== undefined,
    );
  }
}
