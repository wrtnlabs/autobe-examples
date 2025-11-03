import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCreate";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validate successful comment editing within 24-hour window.
 *
 * This test verifies the complete comment modification workflow:
 *
 * 1. Register and authenticate a member
 * 2. Create an article by the member
 * 3. Post a comment on the article
 * 4. Edit the comment within 24 hours with new content
 * 5. Verify the edited comment reflects updated content
 * 6. Verify edit_count increments and updated_at timestamp changes
 * 7. Verify created_at and author information remain unchanged
 * 8. Confirm proper audit trail for comment modifications
 */
export async function test_api_comment_member_edit_within_24_hours(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a member
  const memberEmail =
    `member_${RandomGenerator.alphaNumeric(8)}@example.com` satisfies string &
      tags.Format<"email">;
  const memberPassword = "Password123";

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(authorizedMember);

  // Step 2: Create an article
  const articleTitle = RandomGenerator.paragraph({ sentences: 3 });
  const articleContent = RandomGenerator.content({ paragraphs: 2 });

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: articleTitle,
        content: articleContent,
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);
  TestValidator.equals(
    "article created successfully",
    article.title,
    articleTitle,
  );

  // Step 3: Create a comment on the article
  const initialCommentContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });

  const createdComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: initialCommentContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(createdComment);
  TestValidator.equals(
    "initial comment content matches",
    createdComment.content,
    initialCommentContent,
  );
  TestValidator.equals("edit count starts at 0", createdComment.edit_count, 0);
  TestValidator.equals(
    "comment status is published",
    createdComment.status,
    "published",
  );

  const originalCreatedAt = createdComment.created_at;
  const originalAuthorId = createdComment.author.id;

  // Step 4: Edit the comment with new content within 24 hours
  const updatedCommentContent = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 4,
    wordMax: 9,
  });

  const editedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: createdComment.id,
        body: {
          content: updatedCommentContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(editedComment);

  // Step 5: Verify edited comment reflects updated content
  TestValidator.equals(
    "comment content is updated",
    editedComment.content,
    updatedCommentContent,
  );
  TestValidator.notEquals(
    "new content differs from original",
    editedComment.content,
    initialCommentContent,
  );

  // Step 6: Verify edit_count increments and updated_at changes
  TestValidator.equals(
    "edit count incremented to 1",
    editedComment.edit_count,
    1,
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    editedComment.updated_at,
    createdComment.updated_at,
  );

  // Step 7: Verify created_at and author information remain unchanged
  TestValidator.equals(
    "created_at timestamp preserved",
    editedComment.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "author ID remains unchanged",
    editedComment.author.id,
    originalAuthorId,
  );
  TestValidator.equals(
    "author email preserved",
    editedComment.author.email,
    memberEmail,
  );

  // Step 8: Verify comment still has published status
  TestValidator.equals(
    "comment status remains published",
    editedComment.status,
    "published",
  );
  TestValidator.equals(
    "article association unchanged",
    editedComment.discussion_board_article_id,
    article.id,
  );

  // Step 9: Verify proper audit trail
  TestValidator.predicate("comment is editable", editedComment.edit_count >= 0);
  TestValidator.predicate(
    "timestamp ordering correct",
    new Date(editedComment.updated_at) >= new Date(editedComment.created_at),
  );
}
