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
 * Test filtering file attachments by filename using the search parameter.
 *
 * This test validates that file search functionality works correctly with
 * case-insensitive partial matching against original filenames. Creates an
 * article as a member, uploads several files with distinct names like
 * 'economic_report.pdf', 'political_analysis.docx', 'budget_data.xlsx', and
 * 'meeting_notes.txt'. Uses the search parameter to find files containing
 * 'report' and verifies only matching files are returned. Tests multiple search
 * queries with different patterns to ensure partial matching works correctly
 * and that search is case-insensitive. Verifies pagination metadata reflects
 * the filtered result count rather than total files.
 */
export async function test_api_article_files_search_by_filename(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      username: RandomGenerator.name(),
      href: "https://test.example.com/register",
      referrer: "https://test.example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create an article to attach files to
  const article = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: {
        title: "Economic and Political Analysis Article",
        body: "This article contains various supporting documents for economic and political discussions.",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 3: Upload multiple files with distinct, searchable names
  const fileData = [
    {
      original_filename: "economic_report.pdf",
      content_type: "application/pdf",
      file_size: 524288,
      storage_url: "https://storage.example.com/files/economic_report.pdf",
    },
    {
      original_filename: "political_analysis.docx",
      content_type:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      file_size: 102400,
      storage_url: "https://storage.example.com/files/political_analysis.docx",
    },
    {
      original_filename: "budget_data.xlsx",
      content_type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      file_size: 204800,
      storage_url: "https://storage.example.com/files/budget_data.xlsx",
    },
    {
      original_filename: "meeting_notes.txt",
      content_type: "text/plain",
      file_size: 4096,
      storage_url: "https://storage.example.com/files/meeting_notes.txt",
    },
  ];

  const uploadedFiles = await ArrayUtil.asyncMap(fileData, async (file) => {
    const uploaded =
      await api.functional.discussionBoard.member.articles.files.create(
        connection,
        {
          articleId: article.id,
          body: {
            original_filename: file.original_filename,
            file_size: file.file_size,
            content_type: file.content_type,
            storage_url: file.storage_url,
          } satisfies IDiscussionBoardArticleFile.ICreate,
        },
      );
    typia.assert(uploaded);
    return uploaded;
  });

  // Step 4: Search for files containing "report"
  const reportSearchResult =
    await api.functional.discussionBoard.articles.files.index(connection, {
      articleId: article.id,
      body: {
        search: "report",
      } satisfies IDiscussionBoardArticleFile.IRequest,
    });
  typia.assert(reportSearchResult);

  // Step 5: Validate that only matching files are returned
  TestValidator.equals(
    "search 'report' should return 1 file",
    reportSearchResult.data.length,
    1,
  );
  TestValidator.equals(
    "found file should be economic_report.pdf",
    reportSearchResult.data[0].name,
    "economic_report.pdf",
  );
  TestValidator.equals(
    "pagination should reflect filtered count",
    reportSearchResult.pagination.records,
    1,
  );

  // Step 6: Test case-insensitive matching with "REPORT"
  const upperCaseSearchResult =
    await api.functional.discussionBoard.articles.files.index(connection, {
      articleId: article.id,
      body: {
        search: "REPORT",
      } satisfies IDiscussionBoardArticleFile.IRequest,
    });
  typia.assert(upperCaseSearchResult);

  TestValidator.equals(
    "case-insensitive search 'REPORT' should return 1 file",
    upperCaseSearchResult.data.length,
    1,
  );
  TestValidator.equals(
    "uppercase search should find economic_report.pdf",
    upperCaseSearchResult.data[0].name,
    "economic_report.pdf",
  );

  // Step 7: Test search with "analysis" pattern
  const analysisSearchResult =
    await api.functional.discussionBoard.articles.files.index(connection, {
      articleId: article.id,
      body: {
        search: "analysis",
      } satisfies IDiscussionBoardArticleFile.IRequest,
    });
  typia.assert(analysisSearchResult);

  TestValidator.equals(
    "search 'analysis' should return 1 file",
    analysisSearchResult.data.length,
    1,
  );
  TestValidator.equals(
    "found file should be political_analysis.docx",
    analysisSearchResult.data[0].name,
    "political_analysis.docx",
  );

  // Step 8: Test search with "data" pattern
  const dataSearchResult =
    await api.functional.discussionBoard.articles.files.index(connection, {
      articleId: article.id,
      body: {
        search: "data",
      } satisfies IDiscussionBoardArticleFile.IRequest,
    });
  typia.assert(dataSearchResult);

  TestValidator.equals(
    "search 'data' should return 1 file",
    dataSearchResult.data.length,
    1,
  );
  TestValidator.equals(
    "found file should be budget_data.xlsx",
    dataSearchResult.data[0].name,
    "budget_data.xlsx",
  );

  // Step 9: Test search with partial match "eco"
  const partialSearchResult =
    await api.functional.discussionBoard.articles.files.index(connection, {
      articleId: article.id,
      body: {
        search: "eco",
      } satisfies IDiscussionBoardArticleFile.IRequest,
    });
  typia.assert(partialSearchResult);

  TestValidator.equals(
    "partial search 'eco' should return 1 file",
    partialSearchResult.data.length,
    1,
  );
  TestValidator.equals(
    "partial match should find economic_report.pdf",
    partialSearchResult.data[0].name,
    "economic_report.pdf",
  );

  // Step 10: Test search with no matches
  const noMatchSearchResult =
    await api.functional.discussionBoard.articles.files.index(connection, {
      articleId: article.id,
      body: {
        search: "nonexistent",
      } satisfies IDiscussionBoardArticleFile.IRequest,
    });
  typia.assert(noMatchSearchResult);

  TestValidator.equals(
    "search with no matches should return empty array",
    noMatchSearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records should be 0 for no matches",
    noMatchSearchResult.pagination.records,
    0,
  );

  // Step 11: Test search without search parameter returns all files
  const allFilesResult =
    await api.functional.discussionBoard.articles.files.index(connection, {
      articleId: article.id,
      body: {} satisfies IDiscussionBoardArticleFile.IRequest,
    });
  typia.assert(allFilesResult);

  TestValidator.equals(
    "request without search should return all 4 files",
    allFilesResult.data.length,
    4,
  );
  TestValidator.equals(
    "pagination should show total count of 4",
    allFilesResult.pagination.records,
    4,
  );
}
