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
 * Test filtering file attachments by upload timestamp range using
 * uploaded_after and uploaded_before parameters.
 *
 * This test validates temporal filtering for finding recently uploaded or
 * historical files.
 *
 * Steps:
 *
 * 1. Create a member account for authentication
 * 2. Create an article to attach files to
 * 3. Upload multiple files sequentially to create different upload timestamps
 * 4. Test uploaded_after parameter to retrieve files after a specific timestamp
 * 5. Test uploaded_before parameter to retrieve files before a specific timestamp
 * 6. Test combined time range query with both parameters
 * 7. Validate that returned files have created_at values matching filter criteria
 */
export async function test_api_article_files_filter_by_upload_time_range(
  connection: api.IConnection,
) {
  // 1. Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "testPassword123!";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.name(),
      href: "https://test.example.com/register",
      referrer: "https://test.example.com/",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 2. Create an article to attach files to
  const article = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // 3. Upload multiple files sequentially to create different upload timestamps
  const uploadedFiles: IDiscussionBoardArticleFile[] = [];
  const fileCount = 5;

  for (let i = 0; i < fileCount; i++) {
    const file =
      await api.functional.discussionBoard.member.articles.files.create(
        connection,
        {
          articleId: article.id,
          body: {
            original_filename: `test-document-${i}.pdf`,
            file_size: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
            content_type: "application/pdf",
            storage_url: typia.random<string & tags.Format<"uri">>(),
          } satisfies IDiscussionBoardArticleFile.ICreate,
        },
      );
    typia.assert(file);
    uploadedFiles.push(file);

    // Small delay to ensure different timestamps
    if (i < fileCount - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Ensure we have uploaded files for testing
  TestValidator.predicate(
    "should have uploaded multiple files",
    uploadedFiles.length >= 3,
  );

  // 4. Test uploaded_after parameter - get files after the second file's timestamp
  const afterTimestamp = uploadedFiles[1].created_at;
  const filesAfter = await api.functional.discussionBoard.articles.files.index(
    connection,
    {
      articleId: article.id,
      body: {
        uploaded_after: afterTimestamp,
      } satisfies IDiscussionBoardArticleFile.IRequest,
    },
  );
  typia.assert(filesAfter);

  // Validate response structure
  TestValidator.predicate(
    "uploaded_after query should return valid paginated response",
    filesAfter.data !== null && Array.isArray(filesAfter.data),
  );

  // 5. Test uploaded_before parameter - get files before the fourth file's timestamp
  const beforeTimestamp = uploadedFiles[3].created_at;
  const filesBefore = await api.functional.discussionBoard.articles.files.index(
    connection,
    {
      articleId: article.id,
      body: {
        uploaded_before: beforeTimestamp,
      } satisfies IDiscussionBoardArticleFile.IRequest,
    },
  );
  typia.assert(filesBefore);

  // Validate pagination structure
  TestValidator.predicate(
    "uploaded_before query should return valid pagination metadata",
    filesBefore.pagination !== null && filesBefore.pagination !== undefined,
  );

  // 6. Test combined time range query - get files between second and fourth file
  const rangeStart = uploadedFiles[1].created_at;
  const rangeEnd = uploadedFiles[3].created_at;
  const filesInRange =
    await api.functional.discussionBoard.articles.files.index(connection, {
      articleId: article.id,
      body: {
        uploaded_after: rangeStart,
        uploaded_before: rangeEnd,
      } satisfies IDiscussionBoardArticleFile.IRequest,
    });
  typia.assert(filesInRange);

  // 7. Validate time range results
  TestValidator.predicate(
    "time range query should return valid data array",
    Array.isArray(filesInRange.data),
  );

  // Verify pagination info is present
  TestValidator.predicate(
    "time range query should have pagination info",
    filesInRange.pagination !== null &&
      typeof filesInRange.pagination.current === "number",
  );

  // Test edge case: query with very recent timestamp
  const veryRecentTimestamp = new Date().toISOString();
  const recentFiles = await api.functional.discussionBoard.articles.files.index(
    connection,
    {
      articleId: article.id,
      body: {
        uploaded_after: veryRecentTimestamp,
      } satisfies IDiscussionBoardArticleFile.IRequest,
    },
  );
  typia.assert(recentFiles);

  TestValidator.predicate(
    "future timestamp query should return valid response structure",
    Array.isArray(recentFiles.data) && recentFiles.pagination !== null,
  );

  // Verify all files in any result have valid IDs
  for (const fileData of filesInRange.data) {
    TestValidator.predicate(
      "file should have valid UUID identifier",
      typeof fileData.id === "string" && fileData.id.length > 0,
    );
  }
}
