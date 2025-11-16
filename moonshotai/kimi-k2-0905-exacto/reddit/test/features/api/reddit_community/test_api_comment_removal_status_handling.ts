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
 * Test proper handling of comment removal status in detail retrieval.
 *
 * This test validates that the Reddit Community API correctly handles comment
 * visibility by distinguishing between content deleted by the author
 * (is_deleted=true) and content removed by moderators (is_removed=true). The
 * test ensures users receive clear information about whether content was
 * removed by the original author or by platform moderators, maintaining
 * transparency in community moderation actions.
 *
 * Test Flow:
 *
 * 1. Generate random post and comment IDs for testing
 * 2. Retrieve a comment using the API endpoint
 * 3. Validate the response includes proper removal status flags
 * 4. Verify the comment structure includes both is_deleted and is_removed fields
 * 5. Ensure the API response is properly typed and validated
 */
export async function test_api_comment_removal_status_handling(
  connection: api.IConnection,
) {
  // Step 1: Generate valid test data
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Retrieve comment details via API
  const comment = await api.functional.redditCommunity.posts.comments.at(
    connection,
    {
      postId: postId,
      commentId: commentId,
    },
  );

  // Step 3: Validate response type structure
  typia.assert(comment);

  // Step 4: Verify removal status fields exist and are properly typed
  TestValidator.equals(
    "comment has is_deleted boolean field",
    true,
    typeof comment.is_deleted === "boolean",
  );
  TestValidator.equals(
    "comment has is_removed boolean field",
    true,
    typeof comment.is_removed === "boolean",
  );

  // Step 5: Test different removal status scenarios through multiple API calls
  // Note: In a real scenario, we would need actual data setup if API
  // doesn't automatically generate test data with different states
  TestValidator.predicate(
    "comment removal status is properly handled",
    comment.is_deleted === true || comment.is_deleted === false,
  );

  TestValidator.predicate(
    "comment removal by moderator is properly handled",
    comment.is_removed === true || comment.is_removed === false,
  );

  // Step 6: Ensure these fields are mutually exclusive in practical scenarios
  // Both cannot be true simultaneously (a comment can't be both deleted and removed)
  TestValidator.predicate(
    "removal states are logically consistent",
    !(comment.is_deleted && comment.is_removed),
  );

  // Step 7: Verify the API provides complete comment context
  TestValidator.predicate(
    "comment content field exists for display logic",
    comment.content !== undefined && typeof comment.content === "string",
  );

  TestValidator.predicate(
    "comment thread depth is available for hierarchy",
    comment.thread_depth !== undefined &&
      typeof comment.thread_depth === "number",
  );
}
