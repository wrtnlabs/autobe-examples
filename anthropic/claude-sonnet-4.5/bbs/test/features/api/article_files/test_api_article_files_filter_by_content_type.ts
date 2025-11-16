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
 * Test filtering file attachments by MIME content type for precise format-based
 * queries.
 *
 * This test validates that content_type filtering provides accurate file type
 * identification superior to extension-based filtering. It creates an article
 * with multiple file types (PDF, DOCX, XLSX, TXT) and verifies that filtering
 * by specific MIME types returns only the files matching that exact content
 * type.
 *
 * Steps:
 *
 * 1. Create and authenticate a member account
 * 2. Create a discussion board article
 * 3. Upload files with various content types (PDF, DOCX, XLSX, TXT)
 * 4. Filter by content_type='application/pdf' and verify only PDF files returned
 * 5. Filter by other MIME types to ensure accurate content type filtering
 */
export async function test_api_article_files_filter_by_content_type(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create a discussion board article
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: articleData,
    },
  );
  typia.assert(article);

  // Step 3: Upload files with various content types
  const pdfFile = {
    original_filename: "research_paper.pdf",
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    content_type: "application/pdf",
    storage_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardArticleFile.ICreate;

  const docxFile = {
    original_filename: "document.docx",
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    content_type:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    storage_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardArticleFile.ICreate;

  const xlsxFile = {
    original_filename: "spreadsheet.xlsx",
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    content_type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    storage_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardArticleFile.ICreate;

  const txtFile = {
    original_filename: "notes.txt",
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    content_type: "text/plain",
    storage_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardArticleFile.ICreate;

  // Upload all files
  const uploadedPdf =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: pdfFile,
      },
    );
  typia.assert(uploadedPdf);

  const uploadedDocx =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: docxFile,
      },
    );
  typia.assert(uploadedDocx);

  const uploadedXlsx =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: xlsxFile,
      },
    );
  typia.assert(uploadedXlsx);

  const uploadedTxt =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: txtFile,
      },
    );
  typia.assert(uploadedTxt);

  // Step 4: Filter by content_type='application/pdf' and verify only PDF files returned
  const pdfFilterRequest = {
    content_type: "application/pdf",
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardArticleFile.IRequest;

  const pdfResults = await api.functional.discussionBoard.articles.files.index(
    connection,
    {
      articleId: article.id,
      body: pdfFilterRequest,
    },
  );
  typia.assert(pdfResults);

  TestValidator.predicate(
    "PDF filter returns at least one result",
    pdfResults.data.length > 0,
  );

  TestValidator.predicate(
    "All returned files have PDF content type",
    pdfResults.data.every((file) => file.content_type === "application/pdf"),
  );

  // Step 5: Filter by DOCX content type
  const docxFilterRequest = {
    content_type:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardArticleFile.IRequest;

  const docxResults = await api.functional.discussionBoard.articles.files.index(
    connection,
    {
      articleId: article.id,
      body: docxFilterRequest,
    },
  );
  typia.assert(docxResults);

  TestValidator.predicate(
    "DOCX filter returns at least one result",
    docxResults.data.length > 0,
  );

  TestValidator.predicate(
    "All returned files have DOCX content type",
    docxResults.data.every(
      (file) =>
        file.content_type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ),
  );

  // Step 6: Filter by XLSX content type
  const xlsxFilterRequest = {
    content_type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardArticleFile.IRequest;

  const xlsxResults = await api.functional.discussionBoard.articles.files.index(
    connection,
    {
      articleId: article.id,
      body: xlsxFilterRequest,
    },
  );
  typia.assert(xlsxResults);

  TestValidator.predicate(
    "XLSX filter returns at least one result",
    xlsxResults.data.length > 0,
  );

  TestValidator.predicate(
    "All returned files have XLSX content type",
    xlsxResults.data.every(
      (file) =>
        file.content_type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ),
  );

  // Step 7: Filter by text/plain content type
  const txtFilterRequest = {
    content_type: "text/plain",
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardArticleFile.IRequest;

  const txtResults = await api.functional.discussionBoard.articles.files.index(
    connection,
    {
      articleId: article.id,
      body: txtFilterRequest,
    },
  );
  typia.assert(txtResults);

  TestValidator.predicate(
    "TXT filter returns at least one result",
    txtResults.data.length > 0,
  );

  TestValidator.predicate(
    "All returned files have text/plain content type",
    txtResults.data.every((file) => file.content_type === "text/plain"),
  );
}
