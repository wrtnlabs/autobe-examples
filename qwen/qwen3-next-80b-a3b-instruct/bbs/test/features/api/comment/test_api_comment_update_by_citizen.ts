import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizen";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

export async function test_api_comment_update_by_citizen(
  connection: api.IConnection,
) {
  // 1. Create a new citizen account
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = "SecurePassword123!";
  const createdCitizen: IDiscussionBoardCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: {
        email,
        password,
      } satisfies IDiscussionBoardCitizen.ICreate,
    });
  typia.assert(createdCitizen);

  // 2. Create a post to host the comment
  const postContent = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 8,
  });
  const createdPost: IDiscussionBoardPost =
    await api.functional.discussionBoard.citizen.posts.create(connection, {
      body: postContent satisfies IDiscussionBoardPost.ICreate,
    });
  typia.assert(createdPost);

  // 3. Create a comment on the post as the authenticated citizen
  const commentContent: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const createdComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.citizen.posts.comments.create(
      connection,
      {
        postId: createdPost,
        body: {
          discussion_board_post_id: createdPost,
          content: commentContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(createdComment);

  // 4. Attempt to update the comment within the 24-hour window (success case)
  // As we cannot know exact times when comments are created on server-side, we assume update is valid
  const updatedContent: string = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 8,
  });

  // Verify comment is active and authored by citizen
  TestValidator.equals(
    "comment created successfully",
    createdComment.status,
    "active",
  );
  TestValidator.equals(
    "comment authored by citizen",
    createdComment.author_type,
    "citizen",
  );

  // Update comment with new content
  const updatedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.citizen.comments.update(connection, {
      commentId: createdComment.id,
      body: updatedContent satisfies IDiscussionBoardComment.IUpdate,
    });
  typia.assert(updatedComment);

  // 5. Validate that the update was successful
  // Check that content was updated
  TestValidator.equals(
    "comment content updated",
    updatedComment.content,
    updatedContent,
  );
  // Check that updated_at was updated (newer than created_at, server brings timestamp)
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedComment.updated_at) > new Date(createdComment.created_at),
  );
  // Check that authorship and status remained unchanged
  TestValidator.equals(
    "author_id unchanged",
    updatedComment.author_id,
    createdComment.author_id,
  );
  TestValidator.equals(
    "author_type unchanged",
    updatedComment.author_type,
    createdComment.author_type,
  );
  TestValidator.equals("status unchanged", updatedComment.status, "active");

  // 6. Test rejection of update when authored by another citizen
  // Create a new citizen account
  const otherEmail: string = typia.random<string & tags.Format<"email">>();
  const otherPassword: string = "OtherSecurePassword456!";
  const otherConnection: api.IConnection = { ...connection, headers: {} };
  const otherCitizen: IDiscussionBoardCitizen.IAuthorized =
    await api.functional.auth.citizen.join(otherConnection, {
      body: {
        email: otherEmail,
        password: otherPassword,
      } satisfies IDiscussionBoardCitizen.ICreate,
    });
  typia.assert(otherCitizen);

  // Create a comment as the other citizen
  const otherCommentContent: string = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 6,
  });
  const otherComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.citizen.posts.comments.create(
      otherConnection,
      {
        postId: createdPost,
        body: {
          discussion_board_post_id: createdPost,
          content: otherCommentContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(otherComment);

  // Try to update the other citizen's comment using original citizen connection
  await TestValidator.error(
    "update should be rejected when authored by another citizen",
    async () => {
      await api.functional.discussionBoard.citizen.comments.update(connection, {
        commentId: otherComment.id,
        body: "Updated by unauthorized user" satisfies IDiscussionBoardComment.IUpdate,
      });
    },
  );

  // 7. Test update content length validation
  // Update with content exceeding 1000 characters
  const longText = ArrayUtil.repeat(100, () =>
    RandomGenerator.paragraph({ sentences: 1, wordMin: 10, wordMax: 15 }),
  ).join(" ");
  // Ensure it exceeds 1000 characters
  if (longText.length > 1000) {
    await TestValidator.error(
      "update should be rejected with content > 1000 characters",
      async () => {
        await api.functional.discussionBoard.citizen.comments.update(
          connection,
          {
            commentId: createdComment.id,
            body: longText satisfies IDiscussionBoardComment.IUpdate,
          },
        );
      },
    );
  }

  // Test empty content - this violates MinLength<1>
  await TestValidator.error(
    "update should be rejected with empty content",
    async () => {
      await api.functional.discussionBoard.citizen.comments.update(connection, {
        commentId: createdComment.id,
        body: "" satisfies IDiscussionBoardComment.IUpdate,
      });
    },
  );
}
