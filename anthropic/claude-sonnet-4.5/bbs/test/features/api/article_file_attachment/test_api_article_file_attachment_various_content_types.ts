import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test uploading file attachments with different content types to validate that
 * the system correctly handles various document formats.
 *
 * This test ensures the discussion board article file attachment system
 * properly accepts and stores files with different MIME types commonly used in
 * economic and political discussions, including PDF, Word, Excel, CSV, and
 * plain text files.
 *
 * Test workflow:
 *
 * 1. Register a new member account and obtain authentication token
 * 2. Create a discussion board article
 * 3. Attach a PDF file (application/pdf)
 * 4. Attach a Word document
 *    (application/vnd.openxmlformats-officedocument.wordprocessingml.document)
 * 5. Attach an Excel spreadsheet
 *    (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
 * 6. Attach a CSV file (text/csv)
 * 7. Attach a plain text file (text/plain)
 * 8. Verify all files are created with correct content_type values
 * 9. Validate that the system accepts all documented supported formats
 */
export async function test_api_article_file_attachment_various_content_types(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "securePassword123!";
  const memberUsername = RandomGenerator.name(2);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: memberUsername,
      href: "https://discussion-board.example.com/register",
      referrer: "https://discussion-board.example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a discussion board article
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const articleBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: articleTitle,
        body: articleBody,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 3: Attach a PDF file (application/pdf)
  const pdfFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: {
          original_filename: "economic_analysis_report.pdf",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          content_type: "application/pdf",
          storage_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(pdfFile);
  TestValidator.equals(
    "PDF content type matches",
    pdfFile.content_type,
    "application/pdf",
  );

  // Step 4: Attach a Word document (.docx)
  const wordFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: {
          original_filename: "policy_proposal.docx",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          content_type:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          storage_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(wordFile);
  TestValidator.equals(
    "Word document content type matches",
    wordFile.content_type,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );

  // Step 5: Attach an Excel spreadsheet (.xlsx)
  const excelFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: {
          original_filename: "budget_data.xlsx",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          content_type:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          storage_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(excelFile);
  TestValidator.equals(
    "Excel spreadsheet content type matches",
    excelFile.content_type,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );

  // Step 6: Attach a CSV file (text/csv)
  const csvFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: {
          original_filename: "statistical_data.csv",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          content_type: "text/csv",
          storage_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(csvFile);
  TestValidator.equals(
    "CSV content type matches",
    csvFile.content_type,
    "text/csv",
  );

  // Step 7: Attach a plain text file (text/plain)
  const textFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: {
          original_filename: "notes.txt",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          content_type: "text/plain",
          storage_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(textFile);
  TestValidator.equals(
    "Plain text content type matches",
    textFile.content_type,
    "text/plain",
  );

  // Step 8 & 9: Verify all files have correct metadata
  const allFiles = [pdfFile, wordFile, excelFile, csvFile, textFile];

  TestValidator.predicate(
    "all files have article ID matching the created article",
    allFiles.every((file) => file.discussion_board_article_id === article.id),
  );

  TestValidator.predicate(
    "all files have valid storage URLs",
    allFiles.every((file) => file.storage_url.length > 0),
  );

  TestValidator.predicate(
    "all files have positive file sizes",
    allFiles.every((file) => file.file_size > 0),
  );

  TestValidator.predicate(
    "all files have original filenames",
    allFiles.every((file) => file.original_filename.length > 0),
  );
}
