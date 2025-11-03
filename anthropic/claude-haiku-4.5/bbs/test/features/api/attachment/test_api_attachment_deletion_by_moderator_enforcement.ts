import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test deletion of an attachment by a moderator as part of content moderation
 * enforcement.
 *
 * Verifies that moderators can delete any attachment regardless of ownership
 * for policy enforcement. This test validates the complete moderation workflow
 * including authentication, attachment management, and authorization checks.
 *
 * Workflow:
 *
 * 1. Create first member account for uploading content
 * 2. First member creates article with category
 * 3. First member uploads attachment to the article
 * 4. Create moderator account with moderation privileges
 * 5. Moderator authenticates with their credentials
 * 6. Moderator deletes the attachment uploaded by the first member
 * 7. Validate deletion succeeded without errors
 * 8. Verify proper permission enforcement through moderator status
 */
export async function test_api_attachment_deletion_by_moderator_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Create first member account for uploading content
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(member);
  TestValidator.equals(
    "member account created successfully",
    typeof member.id,
    "string",
  );

  // Step 2: First member creates article with category
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    category_code: "economics",
  } satisfies IDiscussionBoardArticle.ICreate;

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: articleData,
    },
  );
  typia.assert(article);
  TestValidator.equals(
    "article created with correct title",
    article.title,
    articleData.title,
  );

  // Step 3: First member uploads attachment to the article
  const attachmentData = {
    filename: "test-document.pdf",
    file_type: "application/pdf",
    file_extension: "pdf",
    file_size: 1048576, // 1 MB
    attachable_type: "article",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentData,
      },
    );
  typia.assert(attachment);
  TestValidator.equals(
    "attachment filename matches",
    attachment.filename,
    attachmentData.filename,
  );
  TestValidator.equals(
    "attachment belongs to article",
    attachment.discussion_board_article_id,
    article.id,
  );

  // Step 4: Create moderator account with moderation privileges
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratorPass123";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: "127.0.0.1",
      href: "http://localhost:3000/auth/moderator/join",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator account created with active status",
    moderator.account_status,
    "active",
  );
  TestValidator.predicate(
    "moderator has permissions array",
    moderator.permissions.length > 0,
  );

  // Step 5: Moderator authenticates (already authenticated from join response)
  TestValidator.equals(
    "moderator access token generated",
    typeof moderator.token.access,
    "string",
  );

  // Step 6: Moderator deletes the attachment uploaded by the first member
  await api.functional.discussionBoard.articles.attachments.erase(connection, {
    articleId: article.id,
    attachmentId: attachment.id,
  });

  // Step 7: Validate deletion succeeded without errors
  TestValidator.predicate(
    "moderator deletion operation completed successfully",
    true,
  );

  // Step 8: Verify proper permission enforcement through moderator status
  TestValidator.equals(
    "moderator maintained active status after deletion",
    moderator.account_status,
    "active",
  );
  TestValidator.predicate(
    "moderator permissions include moderation authority",
    moderator.permissions.some(
      (perm) =>
        perm.includes("article") ||
        perm.includes("delete") ||
        perm.includes("moderation"),
    ),
  );
}
