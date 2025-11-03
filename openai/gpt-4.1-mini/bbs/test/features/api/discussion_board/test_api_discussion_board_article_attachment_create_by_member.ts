import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * E2E test scenario for adding a new attachment to an existing discussion board
 * article by an authenticated member.
 *
 * Flow:
 *
 * 1. Member joins the discussion board (authentication step).
 * 2. Member creates a new discussion board article with title and markdown
 *    content.
 * 3. Member adds a new attachment to the created article by providing attachment
 *    metadata including filename, file type, and file URL.
 *
 * Validations:
 *
 * - Verify successful member creation with valid token.
 * - Verify article creation with proper fields and attachments array (can be
 *   empty).
 * - Verify that the attachment creation response includes the attached article ID
 *   matching the article created.
 * - Verify attachment metadata fields match input values.
 * - Type assertions on all API responses using typia.assert.
 */
export async function test_api_discussion_board_article_attachment_create_by_member(
  connection: api.IConnection,
) {
  // 1. Member joins the discussion board (authenticate as member)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "strongPassword123";
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      },
    });
  typia.assert(member);

  // 2. Member creates a new discussion board article
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 7,
  });
  const articleContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 3,
    wordMax: 7,
  });
  const articleCreateBody = {
    title: articleTitle,
    content_markdown: articleContent,
    discussion_board_attachments: [], // no attachments at creation
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(article);

  // 3. Member adds a new attachment to the created article
  const attachmentFilename = RandomGenerator.name(1) + ".png";
  const attachmentFileType = "image/png";
  const attachmentFileUrl = `https://example.com/uploads/${attachmentFilename}`;

  const attachmentCreateBody = {
    filename: attachmentFilename,
    file_type: attachmentFileType,
    file_url: attachmentFileUrl,
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachment: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.member.discussionBoardArticles.discussionBoardAttachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentCreateBody,
      },
    );
  typia.assert(attachment);

  // Validations
  TestValidator.equals(
    "attachment articleId matches created article",
    attachment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "attachment filename matches input",
    attachment.filename,
    attachmentFilename,
  );
  TestValidator.equals(
    "attachment file_type matches input",
    attachment.file_type,
    attachmentFileType,
  );
  TestValidator.equals(
    "attachment file_url matches input",
    attachment.file_url,
    attachmentFileUrl,
  );
}
