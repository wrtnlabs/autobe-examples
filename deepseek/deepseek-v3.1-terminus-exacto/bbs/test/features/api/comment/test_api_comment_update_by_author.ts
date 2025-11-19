import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";

/**
 * Test successful comment update workflow where a member creates a post, adds a
 * comment, and then updates their own comment content. Validates that
 * authenticated members can modify their own comments while preserving comment
 * relationships and metadata.
 */
export async function test_api_comment_update_by_author(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const email = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email,
      username: RandomGenerator.alphabets(8),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com",
      referrer: "https://example.com/referrer",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a discussion board post with proper length constraints
  const postTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 8,
  }).substring(0, 200);

  const postContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  }).substring(0, 10000);

  const post = await api.functional.discussionBoard.member.posts.create(
    connection,
    {
      body: {
        title: postTitle satisfies string as string,
        content: postContent satisfies string as string,
        discussion_board_channel_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Create initial comment with proper length constraints
  const initialCommentContent = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 10,
  }).substring(0, 2000);

  const initialComment =
    await api.functional.discussionBoard.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          content: initialCommentContent satisfies string as string,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(initialComment);

  // Step 4: Update the comment with new content that meets length requirements
  const updatedContent = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 12,
  }).substring(0, 2000);

  const updatedComment =
    await api.functional.discussionBoard.member.comments.update(connection, {
      commentId: initialComment.id,
      body: {
        content: updatedContent satisfies string as string,
      } satisfies IDiscussionBoardComment.IUpdate,
    });
  typia.assert(updatedComment);

  // Step 5: Validate the comment was successfully updated
  TestValidator.equals(
    "comment content should be updated",
    updatedComment.content,
    updatedContent,
  );
  TestValidator.notEquals(
    "updated timestamp should change",
    initialComment.updated_at,
    updatedComment.updated_at,
  );
  TestValidator.predicate(
    "updated timestamp should be after creation",
    new Date(updatedComment.updated_at) > new Date(initialComment.updated_at),
  );

  // Step 6: Verify comment relationships and author information are preserved
  TestValidator.equals(
    "comment ID should remain the same",
    initialComment.id,
    updatedComment.id,
  );
  TestValidator.equals(
    "post reference should be preserved",
    initialComment.post.id,
    updatedComment.post.id,
  );
  TestValidator.equals(
    "author should remain the same",
    initialComment.author.id,
    updatedComment.author.id,
  );
  TestValidator.equals(
    "author name should be preserved",
    initialComment.author.name,
    updatedComment.author.name,
  );
  TestValidator.equals(
    "thread level should be preserved",
    initialComment.thread_level,
    updatedComment.thread_level,
  );
  TestValidator.equals(
    "status should be preserved",
    initialComment.status,
    updatedComment.status,
  );
  TestValidator.equals(
    "creation timestamp should be preserved",
    initialComment.created_at,
    updatedComment.created_at,
  );
  TestValidator.equals(
    "parent reference should be preserved",
    initialComment.parent_id,
    updatedComment.parent_id,
  );
}
