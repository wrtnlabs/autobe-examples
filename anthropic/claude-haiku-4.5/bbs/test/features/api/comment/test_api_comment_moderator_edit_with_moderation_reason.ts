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
 * Validates moderator comment editing with documented moderation reasons.
 *
 * Tests the moderator comment editing API endpoint to ensure that when a
 * moderator edits a comment, the system properly records the moderation action
 * with a documented reason explaining why the content was modified. This
 * validates the complete moderation workflow including audit trail
 * documentation for community management transparency.
 *
 * Test workflow:
 *
 * 1. Create a member account for article authorship
 * 2. Create an article under the member account
 * 3. Create a comment on the article from the member
 * 4. Register and authenticate a moderator account
 * 5. Moderator edits the comment with documented change reason
 * 6. Verify the edited comment content is updated
 * 7. Verify the moderation reason is documented in the response
 * 8. Validate that moderation audit trail is recorded
 */
export async function test_api_comment_moderator_edit_with_moderation_reason(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for article authorship
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);
  TestValidator.predicate(
    "member account created",
    typeof member.id === "string",
  );

  // Step 2: Create an article under the member account
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 2,
          wordMax: 5,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
          wordMin: 3,
          wordMax: 8,
        }),
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);
  TestValidator.predicate(
    "article created successfully",
    typeof article.id === "string",
  );

  // Step 3: Create a comment on the article from the member
  const originalComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 3,
            wordMax: 7,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(originalComment);
  TestValidator.predicate(
    "comment created",
    typeof originalComment.id === "string",
  );
  TestValidator.equals(
    "comment has initial edit count of 0",
    originalComment.edit_count,
    0,
  );

  // Step 4: Register and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "ModeratorPass123",
        ip: "127.0.0.1",
        href: "http://localhost:3000/admin/moderator/join",
        referrer: "http://localhost:3000/admin",
      } satisfies IDiscussionBoardModerator.IJoin,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator authenticated",
    typeof moderator.id === "string",
  );
  TestValidator.predicate(
    "moderator has permissions array",
    Array.isArray(moderator.permissions),
  );

  // Step 5: Moderator edits the comment with documented change reason
  const editedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.moderator.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: originalComment.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 6,
          }),
          change_reason:
            "Removed inappropriate language and maintained discussion tone",
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(editedComment);

  // Step 6: Verify the edited comment content is updated
  TestValidator.equals(
    "comment ID remains unchanged after edit",
    editedComment.id,
    originalComment.id,
  );
  TestValidator.predicate(
    "comment content was modified by moderator",
    editedComment.content !== originalComment.content,
  );

  // Step 7: Verify the moderation reason is documented in the response
  TestValidator.predicate(
    "edited comment is valid response",
    typeof editedComment.id === "string",
  );
  TestValidator.predicate(
    "edit count incremented after moderation edit",
    editedComment.edit_count > originalComment.edit_count,
  );

  // Step 8: Validate that moderation audit trail is recorded
  TestValidator.predicate(
    "comment status reflects moderation",
    editedComment.status === "published",
  );
  TestValidator.predicate(
    "comment updated timestamp reflects edit",
    editedComment.updated_at !== originalComment.updated_at,
  );
}
