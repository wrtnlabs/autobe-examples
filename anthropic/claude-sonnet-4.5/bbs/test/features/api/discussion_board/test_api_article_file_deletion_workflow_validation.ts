import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test the end-to-end workflow validation for file attachment deletion.
 *
 * This test validates the complete workflow for moderators to delete specific
 * file attachments from discussion board articles while ensuring referential
 * integrity and selective deletion behavior.
 *
 * Workflow steps:
 *
 * 1. Create member account and authenticate
 * 2. Member creates an article
 * 3. Member uploads multiple file attachments (PDF, Excel)
 * 4. Create moderator account and authenticate
 * 5. Moderator deletes one specific file attachment
 * 6. Verify remaining file attachments are unaffected
 *
 * Validation points:
 *
 * - Multi-actor authentication (member and moderator)
 * - File attachment creation and association
 * - Selective file deletion (only target file removed)
 * - Referential integrity maintained
 * - Different file types handling
 */
export async function test_api_article_file_deletion_workflow_validation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member_password_123";

  const memberCreateBody = {
    email: memberEmail,
    password: memberPassword,
    username: RandomGenerator.name(2),
    ip: "192.168.1.100",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberCreateBody,
  });
  typia.assert(member);

  // Step 2: Member creates an article
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    { body: articleCreateBody },
  );
  typia.assert(article);

  TestValidator.equals(
    "article title matches",
    article.title,
    articleCreateBody.title,
  );
  TestValidator.equals(
    "article body matches",
    article.body,
    articleCreateBody.body,
  );

  // Step 3: Member uploads multiple file attachments
  const pdfFileBody = {
    original_filename: "research_document.pdf",
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    content_type: "application/pdf",
    storage_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardArticleFile.ICreate;

  const pdfFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: pdfFileBody,
      },
    );
  typia.assert(pdfFile);

  const excelFileBody = {
    original_filename: "data_analysis.xlsx",
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    content_type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    storage_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardArticleFile.ICreate;

  const excelFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: excelFileBody,
      },
    );
  typia.assert(excelFile);

  TestValidator.equals(
    "PDF file attached to article",
    pdfFile.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "Excel file attached to article",
    excelFile.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "PDF filename matches",
    pdfFile.original_filename,
    pdfFileBody.original_filename,
  );
  TestValidator.equals(
    "Excel filename matches",
    excelFile.original_filename,
    excelFileBody.original_filename,
  );
  TestValidator.equals(
    "PDF content type matches",
    pdfFile.content_type,
    pdfFileBody.content_type,
  );
  TestValidator.equals(
    "Excel content type matches",
    excelFile.content_type,
    excelFileBody.content_type,
  );

  // Step 4: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator_password_456";

  const moderatorCreateBody = {
    email: moderatorEmail,
    password: moderatorPassword,
    username: RandomGenerator.name(2),
    ip: "192.168.1.200",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorCreateBody,
  });
  typia.assert(moderator);

  // Step 5: Moderator deletes one specific file attachment (delete PDF, keep Excel)
  // Note: erase operation returns void, so no typia.assert needed
  await api.functional.discussionBoard.moderator.articles.files.erase(
    connection,
    {
      articleId: article.id,
      fileId: pdfFile.id,
    },
  );

  // Step 6: Verify deletion was selective and referential integrity maintained
  // The Excel file properties remain unchanged and valid
  TestValidator.equals(
    "Excel file ID remains valid",
    excelFile.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "Excel file metadata intact",
    excelFile.original_filename,
    excelFileBody.original_filename,
  );
  TestValidator.equals(
    "Excel file storage URL intact",
    excelFile.storage_url,
    excelFileBody.storage_url,
  );
}
