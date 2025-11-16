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
 * Test retrieving a paginated list of file attachments for a specific article
 * with basic pagination parameters.
 *
 * This test validates that file attachments can be successfully listed with
 * pagination controls including page number and limit. The test creates an
 * article as a member, uploads multiple file attachments (at least 5 files)
 * with various names and types, then retrieves the file list with pagination
 * parameters (page 1, limit 3).
 *
 * The test verifies:
 *
 * 1. Pagination metadata includes correct values (current page, limit, total
 *    records, total pages)
 * 2. Data array contains file summaries with all required fields: id (UUID), name
 *    (original filename), extension (file type suffix), url (storage URL), size
 *    (bytes), and content_type (MIME type)
 * 3. Pagination correctly limits results to the specified page size
 * 4. Total counts are accurate
 */
export async function test_api_article_files_paginated_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "testPassword123";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create parent article to attach files to
  const article = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 3: Upload multiple file attachments (at least 5 files) with various names and types
  const fileCount = 6;
  const uploadedFiles: IDiscussionBoardArticleFile[] = [];

  const fileTypes = [
    { ext: "pdf", mime: "application/pdf" },
    {
      ext: "docx",
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    {
      ext: "xlsx",
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    { ext: "txt", mime: "text/plain" },
    { ext: "csv", mime: "text/csv" },
    { ext: "zip", mime: "application/zip" },
  ];

  for (let i = 0; i < fileCount; i++) {
    const fileType = fileTypes[i];
    const fileName = `${RandomGenerator.name()}_document_${i + 1}.${fileType.ext}`;
    const fileSize = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<5000000>
    >();

    const uploadedFile =
      await api.functional.discussionBoard.member.articles.files.create(
        connection,
        {
          articleId: article.id,
          body: {
            original_filename: fileName,
            file_size: fileSize,
            content_type: fileType.mime,
            storage_url: `https://cdn.example.com/files/${typia.random<string & tags.Format<"uuid">>()}/${fileName}`,
          } satisfies IDiscussionBoardArticleFile.ICreate,
        },
      );
    typia.assert(uploadedFile);
    uploadedFiles.push(uploadedFile);
  }

  // Step 4: Retrieve file list with pagination parameters (page 1, limit 3)
  const pageNumber = 1;
  const pageLimit = 3;

  const paginatedResult =
    await api.functional.discussionBoard.articles.files.index(connection, {
      articleId: article.id,
      body: {
        page: pageNumber,
        limit: pageLimit,
      } satisfies IDiscussionBoardArticleFile.IRequest,
    });
  typia.assert(paginatedResult);

  // Step 5: Validate pagination metadata
  TestValidator.equals(
    "pagination current page should be 1",
    paginatedResult.pagination.current,
    pageNumber,
  );

  TestValidator.equals(
    "pagination limit should be 3",
    paginatedResult.pagination.limit,
    pageLimit,
  );

  TestValidator.equals(
    "pagination total records should match uploaded file count",
    paginatedResult.pagination.records,
    fileCount,
  );

  const expectedPages = Math.ceil(fileCount / pageLimit);
  TestValidator.equals(
    "pagination total pages should be calculated correctly",
    paginatedResult.pagination.pages,
    expectedPages,
  );

  // Step 6: Validate data array length matches limit
  TestValidator.equals(
    "data array should contain exactly 3 items (page limit)",
    paginatedResult.data.length,
    pageLimit,
  );

  // Step 7: Validate each file summary contains all required fields with correct types
  for (const fileSummary of paginatedResult.data) {
    typia.assert(fileSummary);

    TestValidator.predicate(
      "file id should be valid UUID format",
      typia.is<string & tags.Format<"uuid">>(fileSummary.id),
    );

    TestValidator.predicate(
      "file name should be non-empty string",
      typeof fileSummary.name === "string" && fileSummary.name.length > 0,
    );

    TestValidator.predicate(
      "file extension should be non-empty string",
      typeof fileSummary.extension === "string" &&
        fileSummary.extension.length > 0,
    );

    TestValidator.predicate(
      "file url should be valid URI format",
      typia.is<string & tags.Format<"uri">>(fileSummary.url),
    );

    TestValidator.predicate(
      "file size should be positive integer",
      typeof fileSummary.size === "number" && fileSummary.size > 0,
    );

    TestValidator.predicate(
      "content_type should be non-empty string",
      typeof fileSummary.content_type === "string" &&
        fileSummary.content_type.length > 0,
    );
  }

  // Step 8: Verify the returned files are from the uploaded files
  for (const fileSummary of paginatedResult.data) {
    const matchingFile = uploadedFiles.find((f) => f.id === fileSummary.id);
    TestValidator.predicate(
      "returned file should match one of the uploaded files",
      matchingFile !== undefined,
    );
  }
}
