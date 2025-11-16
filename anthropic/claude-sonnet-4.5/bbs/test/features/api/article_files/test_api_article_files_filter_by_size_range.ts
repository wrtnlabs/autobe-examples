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
 * Test filtering file attachments by size range using min_size and max_size
 * parameters.
 *
 * This test validates that file size filtering helps users find files within
 * specific byte ranges. The test creates an article with files of varying sizes
 * (small, medium, large, very large) and tests filtering with min_size to
 * exclude small files, max_size to exclude large files, and combined range
 * queries. Validates that size field in response summaries falls within
 * specified ranges.
 *
 * Test Flow:
 *
 * 1. Register a new member account for authentication
 * 2. Create an article to attach files to
 * 3. Upload 4 files with different sizes:
 *
 *    - Small: 5000 bytes (< 10KB)
 *    - Medium: 50000 bytes (10KB-100KB)
 *    - Large: 500000 bytes (100KB-1MB)
 *    - Very Large: 2000000 bytes (> 1MB)
 * 4. Test min_size filtering (>= 10240 bytes) - should return medium, large, very
 *    large
 * 5. Test max_size filtering (<= 102400 bytes) - should return small, medium
 * 6. Test range query (min_size=10240, max_size=102400) - should return only
 *    medium
 * 7. Validate all returned file sizes are within the specified range
 */
export async function test_api_article_files_filter_by_size_range(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassword123!",
    username: RandomGenerator.name(),
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create an article to attach files to
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Upload files with varying sizes
  const fileSizes = [
    { name: "small", size: 5000, description: "under 10KB" },
    { name: "medium", size: 50000, description: "10KB-100KB" },
    { name: "large", size: 500000, description: "100KB-1MB" },
    { name: "veryLarge", size: 2000000, description: "over 1MB" },
  ];

  const uploadedFiles: IDiscussionBoardArticleFile[] = [];

  for (const fileSpec of fileSizes) {
    const fileData = {
      original_filename: `${fileSpec.name}_file_${fileSpec.size}.pdf`,
      file_size: fileSpec.size,
      content_type: "application/pdf",
      storage_url: `https://storage.example.com/files/${typia.random<string & tags.Format<"uuid">>()}.pdf`,
    } satisfies IDiscussionBoardArticleFile.ICreate;

    const uploadedFile: IDiscussionBoardArticleFile =
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

  // Verify all 4 files were uploaded
  TestValidator.equals("uploaded file count", uploadedFiles.length, 4);

  // Step 4: Test min_size filtering (>= 10240 bytes, exclude small files)
  const minSizeFilter = {
    min_size: 10240,
  } satisfies IDiscussionBoardArticleFile.IRequest;

  const minSizeResult: IPageIDiscussionBoardArticleFile.ISummary =
    await api.functional.discussionBoard.articles.files.index(connection, {
      articleId: article.id,
      body: minSizeFilter,
    });
  typia.assert(minSizeResult);

  TestValidator.equals(
    "min_size filter should return 3 files (medium, large, very large)",
    minSizeResult.data.length,
    3,
  );

  for (const file of minSizeResult.data) {
    TestValidator.predicate(
      `file size ${file.size} should be >= 10240`,
      file.size >= 10240,
    );
  }

  // Step 5: Test max_size filtering (<= 102400 bytes, exclude large files)
  const maxSizeFilter = {
    max_size: 102400,
  } satisfies IDiscussionBoardArticleFile.IRequest;

  const maxSizeResult: IPageIDiscussionBoardArticleFile.ISummary =
    await api.functional.discussionBoard.articles.files.index(connection, {
      articleId: article.id,
      body: maxSizeFilter,
    });
  typia.assert(maxSizeResult);

  TestValidator.equals(
    "max_size filter should return 2 files (small, medium)",
    maxSizeResult.data.length,
    2,
  );

  for (const file of maxSizeResult.data) {
    TestValidator.predicate(
      `file size ${file.size} should be <= 102400`,
      file.size <= 102400,
    );
  }

  // Step 6: Test combined range query (10240 <= size <= 102400)
  const rangeFilter = {
    min_size: 10240,
    max_size: 102400,
  } satisfies IDiscussionBoardArticleFile.IRequest;

  const rangeResult: IPageIDiscussionBoardArticleFile.ISummary =
    await api.functional.discussionBoard.articles.files.index(connection, {
      articleId: article.id,
      body: rangeFilter,
    });
  typia.assert(rangeResult);

  TestValidator.equals(
    "range filter should return 1 file (medium only)",
    rangeResult.data.length,
    1,
  );

  for (const file of rangeResult.data) {
    TestValidator.predicate(
      `file size ${file.size} should be >= 10240`,
      file.size >= 10240,
    );
    TestValidator.predicate(
      `file size ${file.size} should be <= 102400`,
      file.size <= 102400,
    );
  }

  // Verify the medium file is in the range result
  const mediumFile = rangeResult.data[0];
  TestValidator.equals("medium file size matches", mediumFile.size, 50000);
}
