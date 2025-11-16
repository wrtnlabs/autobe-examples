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
 * Test retrieving complete information about a specific comment within a post.
 *
 * This test validates the comment detail retrieval endpoint by:
 *
 * 1. Generating random post and comment IDs for API call
 * 2. Retrieving complete comment information including content and metadata
 * 3. Validating all comment fields are properly returned
 * 4. Verifying voting statistics (upvote/downvote counts)
 * 5. Checking thread hierarchy information (thread_depth)
 * 6. Validating moderation status flags (is_deleted, is_removed)
 * 7. Ensuring contextual information includes author details and post data
 * 8. Verifying parent comment relationships for proper thread structure
 */
export async function test_api_single_comment_detail_retrieval(
  connection: api.IConnection,
) {
  // Generate random post and comment IDs
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve the comment detail
  const comment = await api.functional.redditCommunity.posts.comments.at(
    connection,
    {
      postId,
      commentId,
    },
  );

  // Validate the comment structure and all required fields
  typia.assert(comment);

  // Validate core comment properties
  TestValidator.predicate(
    "comment has valid ID",
    typeof comment.id === "string" && comment.id.length === 36,
  );

  TestValidator.predicate("comment has content", comment.content.length > 0);

  TestValidator.predicate(
    "upvote count is non-negative",
    comment.upvote_count >= 0,
  );

  TestValidator.predicate(
    "downvote count is non-negative",
    comment.downvote_count >= 0,
  );

  // Validate thread hierarchy
  TestValidator.predicate(
    "thread depth is non-negative",
    comment.thread_depth >= 0,
  );

  // Validate moderation status
  TestValidator.equals(
    "is_deleted is boolean",
    typeof comment.is_deleted,
    "boolean",
  );

  TestValidator.equals(
    "is_removed is boolean",
    typeof comment.is_removed,
    "boolean",
  );

  // Validate temporal fields
  TestValidator.predicate(
    "created_at is valid date-time string",
    comment.created_at.includes("T") && comment.created_at.includes("Z"),
  );

  if (comment.updated_at !== null && comment.updated_at !== undefined) {
    TestValidator.predicate(
      "updated_at is valid date-time string",
      comment.updated_at.includes("T") && comment.updated_at.includes("Z"),
    );
  }

  // Validate author information
  TestValidator.predicate(
    "author has valid ID",
    typeof comment.author.id === "string" && comment.author.id.length === 36,
  );

  TestValidator.predicate(
    "author has nickname",
    comment.author.nickname.length > 0,
  );

  TestValidator.predicate(
    "author has valid email format",
    comment.author.email.includes("@"),
  );

  // Validate post context
  TestValidator.predicate(
    "post has valid ID",
    typeof comment.post.id === "string" && comment.post.id.length === 36,
  );

  TestValidator.predicate("post has title", comment.post.title.length > 0);

  // Validate parent comment relationship for nested replies
  if (comment.parent_comment !== null && comment.parent_comment !== undefined) {
    TestValidator.predicate(
      "parent comment has valid ID",
      typeof comment.parent_comment.id === "string" &&
        comment.parent_comment.id.length === 36,
    );

    TestValidator.predicate(
      "parent comment thread depth is less than current comment",
      comment.parent_comment.thread_depth < comment.thread_depth,
    );
  }

  // Validate community context if available
  if (comment.post.community !== null && comment.post.community !== undefined) {
    TestValidator.predicate(
      "community has valid ID",
      typeof comment.post.community.id === "string" &&
        comment.post.community.id.length === 36,
    );

    TestValidator.predicate(
      "community has name",
      comment.post.community.name.length > 0,
    );
  }
}
