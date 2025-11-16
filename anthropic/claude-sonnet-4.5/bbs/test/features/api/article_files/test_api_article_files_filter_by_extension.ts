import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleFile";

/**
 * Test filtering file attachments by file extension to retrieve only specific
 * file types.
 *
 * This test validates extension-based filtering for document type
 * categorization. Creates an article as a member, uploads diverse file types
 * including PDF documents, Word documents (docx), Excel spreadsheets (xlsx),
 * text files (txt), and CSV files. Uses the extension filter parameter to
 * retrieve only PDF files by setting extension to 'pdf', verifies only PDF
 * files are returned. Repeats with different extensions (docx, xlsx, txt) to
 * ensure filtering works correctly for all supported document types. Validates
 * that the extension field in response summaries matches the filter criteria
 * and that pagination metadata accurately reflects filtered counts.
 */
export async function test_api_article_files_filter_by_extension(
  connection: api.IConnection,
) {
  // Step 1: Create a test member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassword123!",
    username: RandomGenerator.name(2),
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create an article
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: articleData,
    },
  );
  typia.assert(article);

  // Step 3: Upload diverse file types
  const fileTypes = [
    { ext: "pdf", contentType: "application/pdf" },
    { ext: "pdf", contentType: "application/pdf" },
    {
      ext: "docx",
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    {
      ext: "docx",
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    {
      ext: "xlsx",
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    {
      ext: "xlsx",
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    { ext: "txt", contentType: "text/plain" },
    { ext: "txt", contentType: "text/plain" },
    { ext: "csv", contentType: "text/csv" },
    { ext: "csv", contentType: "text/csv" },
  ];

  const uploadedFiles: IDiscussionBoardArticleFile[] = [];

  for (const fileType of fileTypes) {
    const fileData = {
      original_filename: `${RandomGenerator.name(1)}.${fileType.ext}`,
      file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      content_type: fileType.contentType,
      storage_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardArticleFile.ICreate;

    const uploadedFile =
      await api.functional.discussionBoard.member.articles.files.create(
        connection,
        {
          articleId: article.id,
          body: fileData,
        },
      );
    typia.assert(uploadedFile);
    uploadedFiles.push(uploadedFile);
  }

  // Step 4: Test PDF filtering
  const pdfFilter = {
    extension: "pdf",
  } satisfies IDiscussionBoardArticleFile.IRequest;

  const pdfResults = await api.functional.discussionBoard.articles.files.index(
    connection,
    {
      articleId: article.id,
      body: pdfFilter,
    },
  );
  typia.assert(pdfResults);

  TestValidator.equals(
    "PDF filter should return 2 files",
    pdfResults.data.length,
    2,
  );
  for (const file of pdfResults.data) {
    TestValidator.equals(
      "PDF file extension should match",
      file.extension,
      "pdf",
    );
  }
  TestValidator.equals(
    "PDF pagination records should be 2",
    pdfResults.pagination.records,
    2,
  );

  // Step 5: Test DOCX filtering
  const docxFilter = {
    extension: "docx",
  } satisfies IDiscussionBoardArticleFile.IRequest;

  const docxResults = await api.functional.discussionBoard.articles.files.index(
    connection,
    {
      articleId: article.id,
      body: docxFilter,
    },
  );
  typia.assert(docxResults);

  TestValidator.equals(
    "DOCX filter should return 2 files",
    docxResults.data.length,
    2,
  );
  for (const file of docxResults.data) {
    TestValidator.equals(
      "DOCX file extension should match",
      file.extension,
      "docx",
    );
  }
  TestValidator.equals(
    "DOCX pagination records should be 2",
    docxResults.pagination.records,
    2,
  );

  // Step 6: Test XLSX filtering
  const xlsxFilter = {
    extension: "xlsx",
  } satisfies IDiscussionBoardArticleFile.IRequest;

  const xlsxResults = await api.functional.discussionBoard.articles.files.index(
    connection,
    {
      articleId: article.id,
      body: xlsxFilter,
    },
  );
  typia.assert(xlsxResults);

  TestValidator.equals(
    "XLSX filter should return 2 files",
    xlsxResults.data.length,
    2,
  );
  for (const file of xlsxResults.data) {
    TestValidator.equals(
      "XLSX file extension should match",
      file.extension,
      "xlsx",
    );
  }
  TestValidator.equals(
    "XLSX pagination records should be 2",
    xlsxResults.pagination.records,
    2,
  );

  // Step 7: Test TXT filtering
  const txtFilter = {
    extension: "txt",
  } satisfies IDiscussionBoardArticleFile.IRequest;

  const txtResults = await api.functional.discussionBoard.articles.files.index(
    connection,
    {
      articleId: article.id,
      body: txtFilter,
    },
  );
  typia.assert(txtResults);

  TestValidator.equals(
    "TXT filter should return 2 files",
    txtResults.data.length,
    2,
  );
  for (const file of txtResults.data) {
    TestValidator.equals(
      "TXT file extension should match",
      file.extension,
      "txt",
    );
  }
  TestValidator.equals(
    "TXT pagination records should be 2",
    txtResults.pagination.records,
    2,
  );

  // Step 8: Test CSV filtering
  const csvFilter = {
    extension: "csv",
  } satisfies IDiscussionBoardArticleFile.IRequest;

  const csvResults = await api.functional.discussionBoard.articles.files.index(
    connection,
    {
      articleId: article.id,
      body: csvFilter,
    },
  );
  typia.assert(csvResults);

  TestValidator.equals(
    "CSV filter should return 2 files",
    csvResults.data.length,
    2,
  );
  for (const file of csvResults.data) {
    TestValidator.equals(
      "CSV file extension should match",
      file.extension,
      "csv",
    );
  }
  TestValidator.equals(
    "CSV pagination records should be 2",
    csvResults.pagination.records,
    2,
  );

  // Step 9: Validate total files without filter
  const allFilesFilter = {} satisfies IDiscussionBoardArticleFile.IRequest;

  const allFilesResults =
    await api.functional.discussionBoard.articles.files.index(connection, {
      articleId: article.id,
      body: allFilesFilter,
    });
  typia.assert(allFilesResults);

  TestValidator.equals(
    "Total files should be 10",
    allFilesResults.data.length,
    10,
  );
  TestValidator.equals(
    "Total pagination records should be 10",
    allFilesResults.pagination.records,
    10,
  );
}
