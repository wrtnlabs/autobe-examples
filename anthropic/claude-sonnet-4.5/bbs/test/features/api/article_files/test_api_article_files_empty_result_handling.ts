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
 * Test that the endpoint correctly handles queries that return no matching
 * files.
 *
 * This scenario validates proper empty result responses with correct pagination
 * metadata. Creates an article as a member, uploads several files, then
 * performs queries with filter criteria that match no files (e.g., search for
 * filename that doesn't exist, filter by extension not present, size range with
 * no matches). Verifies the response returns empty data array, pagination
 * metadata shows 0 records and 0 pages, but maintains proper response
 * structure. Tests edge cases like requesting page 2 when no results exist,
 * ensuring graceful handling without errors. This validates robust handling of
 * no-match scenarios.
 */
export async function test_api_article_files_empty_result_handling(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "testPassword123!",
      username: RandomGenerator.name(),
      href: "https://test.example.com/register",
      referrer: "https://test.example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create an article
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

  // Step 3: Upload several files with known characteristics
  const uploadedFiles = await ArrayUtil.asyncRepeat(5, async (index) => {
    const extensions = ["pdf", "docx", "xlsx", "txt", "csv"] as const;
    const contentTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "text/csv",
    ] as const;

    const ext = extensions[index];
    const contentType = contentTypes[index];
    const filename = `test_file_${index}.${ext}`;
    const fileSize = (1000 + index * 500) satisfies number as number;

    const file =
      await api.functional.discussionBoard.member.articles.files.create(
        connection,
        {
          articleId: article.id,
          body: {
            original_filename: filename,
            file_size: fileSize,
            content_type: contentType,
            storage_url: `https://storage.example.com/files/${filename}`,
          } satisfies IDiscussionBoardArticleFile.ICreate,
        },
      );
    typia.assert(file);
    return file;
  });

  // Step 4: Query with non-existent filename
  const noMatchFilename =
    await api.functional.discussionBoard.articles.files.index(connection, {
      articleId: article.id,
      body: {
        name: "completely_nonexistent_file_12345.xyz",
      } satisfies IDiscussionBoardArticleFile.IRequest,
    });
  typia.assert(noMatchFilename);
  TestValidator.equals(
    "empty result - no matching filename",
    noMatchFilename.data.length,
    0,
  );
  TestValidator.equals(
    "zero records - no matching filename",
    noMatchFilename.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages - no matching filename",
    noMatchFilename.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "valid pagination structure",
    noMatchFilename.pagination.current !== null &&
      noMatchFilename.pagination.current !== undefined &&
      noMatchFilename.pagination.limit !== null &&
      noMatchFilename.pagination.limit !== undefined,
  );

  // Step 5: Query with non-existent extension
  const noMatchExtension =
    await api.functional.discussionBoard.articles.files.index(connection, {
      articleId: article.id,
      body: {
        extension: "xyz",
      } satisfies IDiscussionBoardArticleFile.IRequest,
    });
  typia.assert(noMatchExtension);
  TestValidator.equals(
    "empty result - no matching extension",
    noMatchExtension.data.length,
    0,
  );
  TestValidator.equals(
    "zero records - no matching extension",
    noMatchExtension.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages - no matching extension",
    noMatchExtension.pagination.pages,
    0,
  );

  // Step 6: Query with size range that excludes all files
  const minFileSize = (uploadedFiles
    .map((f) => f.file_size)
    .reduce((a, b) => Math.max(a, b), 0) + 10000) satisfies number as number;
  const noMatchSize = await api.functional.discussionBoard.articles.files.index(
    connection,
    {
      articleId: article.id,
      body: {
        min_size: minFileSize,
      } satisfies IDiscussionBoardArticleFile.IRequest,
    },
  );
  typia.assert(noMatchSize);
  TestValidator.equals(
    "empty result - size too large",
    noMatchSize.data.length,
    0,
  );
  TestValidator.equals(
    "zero records - size too large",
    noMatchSize.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages - size too large",
    noMatchSize.pagination.pages,
    0,
  );

  // Step 7: Query with content type not matching any files
  const noMatchContentType =
    await api.functional.discussionBoard.articles.files.index(connection, {
      articleId: article.id,
      body: {
        content_type: "application/octet-stream",
      } satisfies IDiscussionBoardArticleFile.IRequest,
    });
  typia.assert(noMatchContentType);
  TestValidator.equals(
    "empty result - no matching content type",
    noMatchContentType.data.length,
    0,
  );
  TestValidator.equals(
    "zero records - no matching content type",
    noMatchContentType.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages - no matching content type",
    noMatchContentType.pagination.pages,
    0,
  );

  // Step 8: Edge case - request page 2 when no results exist
  const page2NoResults =
    await api.functional.discussionBoard.articles.files.index(connection, {
      articleId: article.id,
      body: {
        name: "nonexistent_file.txt",
        page: 2,
      } satisfies IDiscussionBoardArticleFile.IRequest,
    });
  typia.assert(page2NoResults);
  TestValidator.equals(
    "empty result - page 2 with no matches",
    page2NoResults.data.length,
    0,
  );
  TestValidator.equals(
    "zero records - page 2 with no matches",
    page2NoResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages - page 2 with no matches",
    page2NoResults.pagination.pages,
    0,
  );
}
