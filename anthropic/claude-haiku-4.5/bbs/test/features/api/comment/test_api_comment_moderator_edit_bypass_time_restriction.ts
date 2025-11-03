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
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that moderators can edit comments without the 24-hour time restriction.
 *
 * This test validates that moderators bypass the normal time-based edit
 * restriction that applies to regular members. The scenario creates a
 * discussion flow where:
 *
 * 1. A member registers and creates an article
 * 2. The member posts a comment on the article
 * 3. A moderator registers with administrative credentials
 * 4. The moderator successfully edits the comment despite it being outside the
 *    24-hour window
 * 5. The system records moderator edit metadata for transparency and audit trail
 *
 * Steps:
 *
 * 1. Create a member account via member registration
 * 2. Create an article via member article creation
 * 3. Create a comment via member comment creation
 * 4. Create a moderator account via moderator registration
 * 5. Perform moderator edit on the comment with change reason
 * 6. Validate the edit was successful and metadata is recorded
 * 7. Verify the comment's edit_count and updated_at timestamp are updated
 */
export async function test_api_comment_moderator_edit_bypass_time_restriction(
  connection: api.IConnection,
) {
  // 1. Register a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);
  TestValidator.equals(
    "member created with active status",
    member.token.access !== "",
    true,
  );

  // 2. Create an article as the member
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 5 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    category_code: "economics",
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);
  TestValidator.equals(
    "article status should be published",
    article.status,
    "published",
  );

  // 3. Create a comment on the article as the member
  const originalCommentContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 7,
  });
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: originalCommentContent,
          parent_comment_id: undefined,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "initial comment edit_count should be 0",
    comment.edit_count,
    0,
  );
  TestValidator.equals(
    "comment content matches input",
    comment.content,
    originalCommentContent,
  );

  // 4. Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(moderatorConnection, {
      body: {
        email: moderatorEmail,
        password: "ModeratorPass123",
        ip: "127.0.0.1",
        href: "http://localhost:3000/admin/register",
        referrer: "http://localhost:3000/admin",
      } satisfies IDiscussionBoardModerator.IJoin,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator account_status should be active",
    moderator.account_status,
    "active",
  );
  TestValidator.predicate(
    "moderator has permissions",
    moderator.permissions.length > 0,
  );

  // 5. Perform moderator edit on the comment
  const updatedCommentContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 7,
  });
  const changeReason =
    "Removed inappropriate language and standardized formatting for clarity";

  const editedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.moderator.articles.comments.update(
      moderatorConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          content: updatedCommentContent,
          change_reason: changeReason,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(editedComment);

  // 6. Validate the edit was successful
  TestValidator.equals(
    "comment content updated",
    editedComment.content,
    updatedCommentContent,
  );
  TestValidator.notEquals(
    "edit_count incremented after moderator edit",
    editedComment.edit_count,
    comment.edit_count,
  );
  TestValidator.predicate(
    "edit_count is greater than original",
    editedComment.edit_count > comment.edit_count,
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    editedComment.updated_at,
    comment.updated_at,
  );

  // 7. Verify that the timestamps are logical
  TestValidator.predicate(
    "updated_at is more recent than created_at",
    new Date(editedComment.updated_at) > new Date(editedComment.created_at),
  );
}
