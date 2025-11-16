import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test file retrieval in scenarios where an article has multiple file
 * attachments.
 *
 * This test validates proper file identification and scoping when multiple
 * files are attached to a single discussion board article. It ensures that the
 * dual-identifier system (articleId + fileId) correctly prevents
 * cross-contamination between different file attachments.
 *
 * Workflow:
 *
 * 1. Create authenticated member account
 * 2. Create discussion board article
 * 3. Upload three distinct file attachments (PDF, Excel, Word)
 * 4. Retrieve each file individually using specific file IDs
 * 5. Validate correct metadata for each file
 * 6. Verify file ID uniqueness and proper scoping
 * 7. Confirm no data cross-contamination between files
 */
export async function test_api_article_file_retrieval_with_multiple_files(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create discussion board article
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Upload three distinct file attachments with different characteristics

  // File 1: PDF document with research data
  const pdfFileData = {
    original_filename: "research_data.pdf",
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    content_type: "application/pdf",
    storage_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardArticleFile.ICreate;

  const pdfFile: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: pdfFileData,
      },
    );
  typia.assert(pdfFile);

  // File 2: Excel spreadsheet with economic statistics
  const excelFileData = {
    original_filename: "economic_statistics.xlsx",
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    content_type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    storage_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardArticleFile.ICreate;

  const excelFile: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: excelFileData,
      },
    );
  typia.assert(excelFile);

  // File 3: Word document with analysis report
  const wordFileData = {
    original_filename: "analysis_report.docx",
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    content_type:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    storage_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardArticleFile.ICreate;

  const wordFile: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: wordFileData,
      },
    );
  typia.assert(wordFile);

  // Step 4 & 5: Retrieve each file individually and validate metadata

  // Retrieve PDF file
  const retrievedPdf: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.articles.files.at(connection, {
      articleId: article.id,
      fileId: pdfFile.id,
    });
  typia.assert(retrievedPdf);

  // Validate PDF file metadata
  TestValidator.equals("PDF file ID matches", retrievedPdf.id, pdfFile.id);
  TestValidator.equals(
    "PDF article ID matches",
    retrievedPdf.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "PDF original filename matches",
    retrievedPdf.original_filename,
    pdfFileData.original_filename,
  );
  TestValidator.equals(
    "PDF file size matches",
    retrievedPdf.file_size,
    pdfFileData.file_size,
  );
  TestValidator.equals(
    "PDF content type matches",
    retrievedPdf.content_type,
    pdfFileData.content_type,
  );
  TestValidator.equals(
    "PDF storage URL matches",
    retrievedPdf.storage_url,
    pdfFileData.storage_url,
  );

  // Retrieve Excel file
  const retrievedExcel: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.articles.files.at(connection, {
      articleId: article.id,
      fileId: excelFile.id,
    });
  typia.assert(retrievedExcel);

  // Validate Excel file metadata
  TestValidator.equals(
    "Excel file ID matches",
    retrievedExcel.id,
    excelFile.id,
  );
  TestValidator.equals(
    "Excel article ID matches",
    retrievedExcel.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "Excel original filename matches",
    retrievedExcel.original_filename,
    excelFileData.original_filename,
  );
  TestValidator.equals(
    "Excel file size matches",
    retrievedExcel.file_size,
    excelFileData.file_size,
  );
  TestValidator.equals(
    "Excel content type matches",
    retrievedExcel.content_type,
    excelFileData.content_type,
  );
  TestValidator.equals(
    "Excel storage URL matches",
    retrievedExcel.storage_url,
    excelFileData.storage_url,
  );

  // Retrieve Word file
  const retrievedWord: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.articles.files.at(connection, {
      articleId: article.id,
      fileId: wordFile.id,
    });
  typia.assert(retrievedWord);

  // Validate Word file metadata
  TestValidator.equals("Word file ID matches", retrievedWord.id, wordFile.id);
  TestValidator.equals(
    "Word article ID matches",
    retrievedWord.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "Word original filename matches",
    retrievedWord.original_filename,
    wordFileData.original_filename,
  );
  TestValidator.equals(
    "Word file size matches",
    retrievedWord.file_size,
    wordFileData.file_size,
  );
  TestValidator.equals(
    "Word content type matches",
    retrievedWord.content_type,
    wordFileData.content_type,
  );
  TestValidator.equals(
    "Word storage URL matches",
    retrievedWord.storage_url,
    wordFileData.storage_url,
  );

  // Step 6: Verify file IDs are unique
  TestValidator.notEquals(
    "PDF and Excel file IDs differ",
    pdfFile.id,
    excelFile.id,
  );
  TestValidator.notEquals(
    "PDF and Word file IDs differ",
    pdfFile.id,
    wordFile.id,
  );
  TestValidator.notEquals(
    "Excel and Word file IDs differ",
    excelFile.id,
    wordFile.id,
  );

  // Step 7: Verify storage URLs are unique (no cross-contamination)
  TestValidator.notEquals(
    "PDF and Excel storage URLs differ",
    pdfFile.storage_url,
    excelFile.storage_url,
  );
  TestValidator.notEquals(
    "PDF and Word storage URLs differ",
    pdfFile.storage_url,
    wordFile.storage_url,
  );
  TestValidator.notEquals(
    "Excel and Word storage URLs differ",
    excelFile.storage_url,
    wordFile.storage_url,
  );

  // Verify all files belong to the same article
  TestValidator.equals(
    "All files belong to same article - PDF",
    pdfFile.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "All files belong to same article - Excel",
    excelFile.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "All files belong to same article - Word",
    wordFile.discussion_board_article_id,
    article.id,
  );
}
