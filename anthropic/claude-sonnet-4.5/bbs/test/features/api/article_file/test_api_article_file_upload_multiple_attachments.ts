import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test uploading multiple file attachments to a single article.
 *
 * This test validates that articles can have multiple supporting documents and
 * that each file is independently tracked with unique identifiers and
 * metadata.
 *
 * Workflow:
 *
 * 1. Create and authenticate a member account
 * 2. Member creates an article about economic policy
 * 3. Upload first file attachment (PDF research paper, 5 MB)
 * 4. Upload second file attachment (Excel spreadsheet, 2 MB)
 * 5. Upload third file attachment (CSV data file, 1 MB)
 * 6. Verify each file attachment has unique id and created_at timestamp
 * 7. Validate all file metadata is preserved correctly
 */
export async function test_api_article_file_upload_multiple_attachments(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "SecurePassword123!",
        username: RandomGenerator.name(),
        href: "https://discussionboard.example.com/register",
        referrer: "https://google.com",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Member creates an article about economic policy
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Impact of Fiscal Policy on Economic Growth",
        body: RandomGenerator.content({
          paragraphs: 5,
          sentenceMin: 15,
          sentenceMax: 25,
        }),
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 3: Upload first file attachment (PDF research paper, 5 MB)
  const pdfFile: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: {
          original_filename: "economic_policy_research.pdf",
          file_size: 5242880,
          content_type: "application/pdf",
          storage_url: "https://storage.example.com/files/abc123.pdf",
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(pdfFile);

  // Step 4: Upload second file attachment (Excel spreadsheet, 2 MB)
  const excelFile: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: {
          original_filename: "economic_indicators_2024.xlsx",
          file_size: 2097152,
          content_type:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          storage_url: "https://storage.example.com/files/def456.xlsx",
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(excelFile);

  // Step 5: Upload third file attachment (CSV data file, 1 MB)
  const csvFile: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: {
          original_filename: "survey_data.csv",
          file_size: 1048576,
          content_type: "text/csv",
          storage_url: "https://storage.example.com/files/ghi789.csv",
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(csvFile);

  // Step 6: Verify each file attachment has unique id and created_at timestamp
  TestValidator.predicate(
    "PDF file has unique id",
    pdfFile.id !== excelFile.id && pdfFile.id !== csvFile.id,
  );
  TestValidator.predicate(
    "Excel file has unique id",
    excelFile.id !== csvFile.id,
  );
  TestValidator.predicate(
    "PDF file has created_at timestamp",
    pdfFile.created_at !== null && pdfFile.created_at !== undefined,
  );
  TestValidator.predicate(
    "Excel file has created_at timestamp",
    excelFile.created_at !== null && excelFile.created_at !== undefined,
  );
  TestValidator.predicate(
    "CSV file has created_at timestamp",
    csvFile.created_at !== null && csvFile.created_at !== undefined,
  );

  // Step 7: Validate all file metadata is preserved correctly
  TestValidator.equals(
    "PDF original filename",
    pdfFile.original_filename,
    "economic_policy_research.pdf",
  );
  TestValidator.equals("PDF file size", pdfFile.file_size, 5242880);
  TestValidator.equals(
    "PDF content type",
    pdfFile.content_type,
    "application/pdf",
  );
  TestValidator.equals(
    "PDF storage url",
    pdfFile.storage_url,
    "https://storage.example.com/files/abc123.pdf",
  );
  TestValidator.equals(
    "PDF article id",
    pdfFile.discussion_board_article_id,
    article.id,
  );

  TestValidator.equals(
    "Excel original filename",
    excelFile.original_filename,
    "economic_indicators_2024.xlsx",
  );
  TestValidator.equals("Excel file size", excelFile.file_size, 2097152);
  TestValidator.equals(
    "Excel content type",
    excelFile.content_type,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  TestValidator.equals(
    "Excel storage url",
    excelFile.storage_url,
    "https://storage.example.com/files/def456.xlsx",
  );
  TestValidator.equals(
    "Excel article id",
    excelFile.discussion_board_article_id,
    article.id,
  );

  TestValidator.equals(
    "CSV original filename",
    csvFile.original_filename,
    "survey_data.csv",
  );
  TestValidator.equals("CSV file size", csvFile.file_size, 1048576);
  TestValidator.equals("CSV content type", csvFile.content_type, "text/csv");
  TestValidator.equals(
    "CSV storage url",
    csvFile.storage_url,
    "https://storage.example.com/files/ghi789.csv",
  );
  TestValidator.equals(
    "CSV article id",
    csvFile.discussion_board_article_id,
    article.id,
  );
}
