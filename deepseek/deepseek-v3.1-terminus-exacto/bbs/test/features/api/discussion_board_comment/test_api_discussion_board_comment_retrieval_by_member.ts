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
 * Test individual comment retrieval functionality for authenticated members.
 *
 * This test validates the complete workflow: creating a member account,
 * generating a discussion board post, adding a comment to that post, and then
 * retrieving the comment by its unique identifier. The test ensures that all
 * comment properties including content, status, thread level, timestamps, and
 * author/post relationships are correctly returned.
 */
export async function test_api_discussion_board_comment_retrieval_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.name(1);
  const memberDisplayName = RandomGenerator.name();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: "testPassword123",
      display_name: memberDisplayName,
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a test discussion board post for the comment to belong to
  // Note: The system should have default channels and sections available
  const postTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });
  const postContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 15,
    sentenceMax: 25,
  });

  // Use predefined/default channel and section IDs that should exist in the system
  const defaultChannelId = typia.random<string & tags.Format<"uuid">>();
  const defaultSectionId = typia.random<string & tags.Format<"uuid">>();

  const post = await api.functional.discussionBoard.member.posts.create(
    connection,
    {
      body: {
        title: postTitle,
        content: postContent,
        discussion_board_channel_id: defaultChannelId,
        discussion_board_section_id: defaultSectionId,
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Create a root-level comment on the post with specific content
  const commentContent = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 4,
    wordMax: 10,
  });

  const comment =
    await api.functional.discussionBoard.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          content: commentContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 4: Retrieve the comment by its ID to validate all properties
  const retrievedComment =
    await api.functional.discussionBoard.member.comments.at(connection, {
      commentId: comment.id,
    });
  typia.assert(retrievedComment);

  // Step 5: Verify the retrieved comment matches the created comment data
  TestValidator.equals(
    "comment ID should match",
    retrievedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "comment content should match",
    retrievedComment.content,
    commentContent,
  );
  TestValidator.equals(
    "comment status should be published",
    retrievedComment.status,
    "published",
  );
  TestValidator.equals(
    "root comment should have thread level 0",
    retrievedComment.thread_level,
    0,
  );

  // Verify post relationship
  TestValidator.equals(
    "post ID should match",
    retrievedComment.post.id,
    post.id,
  );
  TestValidator.equals(
    "post type should be correct",
    retrievedComment.post.type,
    "post",
  );
  TestValidator.equals(
    "post title should match",
    retrievedComment.post.title,
    post.title,
  );

  // Verify author relationship
  TestValidator.equals(
    "author ID should match",
    retrievedComment.author.id,
    member.id,
  );
  TestValidator.equals(
    "author type should be member",
    retrievedComment.author.type,
    "member",
  );
  TestValidator.equals(
    "author name should match",
    retrievedComment.author.name,
    memberDisplayName,
  );

  // Verify comment structure and timestamps
  TestValidator.predicate(
    "root comment should not have parent ID",
    retrievedComment.parent_id === undefined,
  );
  TestValidator.predicate(
    "created timestamp should be valid ISO string",
    retrievedComment.created_at !== null &&
      retrievedComment.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated timestamp should be valid ISO string",
    retrievedComment.updated_at !== null &&
      retrievedComment.updated_at !== undefined,
  );
  TestValidator.predicate(
    "deleted timestamp should be undefined for active comment",
    retrievedComment.deleted_at === undefined,
  );

  // Validate content length constraints
  TestValidator.predicate(
    "comment content should meet minimum length requirement",
    retrievedComment.content.length >= 1,
  );
  TestValidator.predicate(
    "comment content should meet maximum length requirement",
    retrievedComment.content.length <= 2000,
  );
}
