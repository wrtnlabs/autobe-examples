import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizen";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

export async function test_api_comment_update_by_author(
  connection: api.IConnection,
) {
  // 1. Register a new citizen user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IDiscussionBoardCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: {
        email: userEmail,
        password: "password123",
      } satisfies IDiscussionBoardCitizen.ICreate,
    });
  typia.assert(user);

  // 2. Create a new discussion board post
  const postTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 8,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 2,
    wordMax: 6,
  });
  const post: IDiscussionBoardPost =
    await api.functional.discussionBoard.citizen.posts.create(connection, {
      body: `
${postTitle}

${postBody}
` satisfies IDiscussionBoardPost.ICreate,
    });
  typia.assert(post);

  // 3. Create a new comment on the post
  const commentContent: string = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.citizen.posts.comments.create(
      connection,
      {
        postId: post,
        body: {
          discussion_board_post_id: post,
          content: commentContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment content matches",
    comment.content,
    commentContent,
  );
  TestValidator.equals(
    "comment author is citizen",
    comment.author_type,
    "citizen",
  );

  // 4. Update the comment as the original author (within 24-hour window)
  const updatedContent: string = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const updatedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.posts.comments.update(connection, {
      postId: post,
      commentId: comment.id,
      body: updatedContent satisfies IDiscussionBoardComment.IUpdate,
    });
  typia.assert(updatedComment);
  TestValidator.equals(
    "updated comment content matches",
    updatedComment.content,
    updatedContent,
  );
  TestValidator.notEquals(
    "comment was modified",
    comment.updated_at,
    updatedComment.updated_at,
  );
}
