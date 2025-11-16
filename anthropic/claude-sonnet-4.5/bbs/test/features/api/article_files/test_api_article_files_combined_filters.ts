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
 * Test combining multiple filter parameters to perform complex file searches.
 *
 * This scenario validates that all filter criteria work together correctly for
 * precise file discovery. Creates an article as a member, uploads a diverse
 * collection of files with varying properties (names, types, sizes,
 * timestamps). Performs complex queries combining multiple filters: search by
 * filename pattern + filter by extension + limit by size range + restrict by
 * upload time range. For example, search for files containing 'report' that are
 * PDF format, between 50KB-500KB size, uploaded in the last month, sorted by
 * size descending. Verifies that all filter conditions are properly ANDed
 * together and results satisfy every specified criterion. Tests various filter
 * combinations to ensure robust multi-criteria search capability.
 */
export async function test_api_article_files_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member for testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "testPassword123!",
      username: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create an article to attach files to
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

  // Step 3: Upload diverse collection of files with varying properties
  const uploadedFiles: IDiscussionBoardArticleFile[] = [];

  // Create files with different characteristics for comprehensive testing
  const fileConfigs = [
    {
      name: "report_summary_2024.pdf",
      extension: "pdf",
      size: 75000,
      contentType: "application/pdf",
    },
    {
      name: "report_analysis.pdf",
      extension: "pdf",
      size: 120000,
      contentType: "application/pdf",
    },
    {
      name: "data_report.xlsx",
      extension: "xlsx",
      size: 250000,
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    {
      name: "document_final.docx",
      extension: "docx",
      size: 85000,
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    {
      name: "summary_notes.txt",
      extension: "txt",
      size: 15000,
      contentType: "text/plain",
    },
    {
      name: "report_quarterly.pdf",
      extension: "pdf",
      size: 450000,
      contentType: "application/pdf",
    },
    {
      name: "data_export.csv",
      extension: "csv",
      size: 30000,
      contentType: "text/csv",
    },
    {
      name: "meeting_notes.txt",
      extension: "txt",
      size: 8000,
      contentType: "text/plain",
    },
    {
      name: "presentation.pdf",
      extension: "pdf",
      size: 600000,
      contentType: "application/pdf",
    },
    {
      name: "budget_report.xlsx",
      extension: "xlsx",
      size: 180000,
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  ];

  for (const config of fileConfigs) {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const file =
      await api.functional.discussionBoard.member.articles.files.create(
        connection,
        {
          articleId: article.id,
          body: {
            original_filename: config.name,
            file_size: config.size,
            content_type: config.contentType,
            storage_url: `https://storage.example.com/files/${typia.random<string & tags.Format<"uuid">>()}.${config.extension}`,
          } satisfies IDiscussionBoardArticleFile.ICreate,
        },
      );
    typia.assert(file);
    uploadedFiles.push(file);
  }

  // Step 4: Test combined filters - filename pattern + extension + size range
  const combinedFilterResult1 =
    await api.functional.discussionBoard.articles.files.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
        search: "report",
        extension: "pdf",
        min_size: 50000,
        max_size: 500000,
        sort_by: "size",
        sort_order: "desc",
      } satisfies IDiscussionBoardArticleFile.IRequest,
    });
  typia.assert(combinedFilterResult1);

  // Verify all results match ALL filter criteria
  TestValidator.predicate(
    "combined filter results should not be empty",
    combinedFilterResult1.data.length > 0,
  );

  for (const file of combinedFilterResult1.data) {
    TestValidator.predicate(
      "filename contains search term 'report'",
      file.name.toLowerCase().includes("report"),
    );
    TestValidator.equals("file extension is pdf", file.extension, "pdf");
    TestValidator.predicate(
      "file size is between 50KB and 500KB",
      file.size >= 50000 && file.size <= 500000,
    );
  }

  // Verify sort order (descending by size)
  for (let i = 0; i < combinedFilterResult1.data.length - 1; i++) {
    TestValidator.predicate(
      "files sorted by size descending",
      combinedFilterResult1.data[i].size >=
        combinedFilterResult1.data[i + 1].size,
    );
  }

  // Step 5: Test different filter combination - specific extension + size range
  const combinedFilterResult2 =
    await api.functional.discussionBoard.articles.files.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
        extension: "xlsx",
        min_size: 100000,
        max_size: 300000,
        sort_by: "name",
        sort_order: "asc",
      } satisfies IDiscussionBoardArticleFile.IRequest,
    });
  typia.assert(combinedFilterResult2);

  for (const file of combinedFilterResult2.data) {
    TestValidator.equals("file extension is xlsx", file.extension, "xlsx");
    TestValidator.predicate(
      "file size is between 100KB and 300KB",
      file.size >= 100000 && file.size <= 300000,
    );
  }

  // Step 6: Test content type filter with size constraints
  const combinedFilterResult3 =
    await api.functional.discussionBoard.articles.files.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
        content_type: "application/pdf",
        min_size: 70000,
        max_size: 200000,
        sort_by: "size",
        sort_order: "asc",
      } satisfies IDiscussionBoardArticleFile.IRequest,
    });
  typia.assert(combinedFilterResult3);

  for (const file of combinedFilterResult3.data) {
    TestValidator.equals(
      "content type is PDF",
      file.content_type,
      "application/pdf",
    );
    TestValidator.predicate(
      "file size is between 70KB and 200KB",
      file.size >= 70000 && file.size <= 200000,
    );
  }

  // Verify ascending sort order
  for (let i = 0; i < combinedFilterResult3.data.length - 1; i++) {
    TestValidator.predicate(
      "files sorted by size ascending",
      combinedFilterResult3.data[i].size <=
        combinedFilterResult3.data[i + 1].size,
    );
  }

  // Step 7: Test search with multiple criteria including name filter
  const combinedFilterResult4 =
    await api.functional.discussionBoard.articles.files.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 10,
        name: "data",
        min_size: 20000,
        sort_by: "name",
        sort_order: "asc",
      } satisfies IDiscussionBoardArticleFile.IRequest,
    });
  typia.assert(combinedFilterResult4);

  for (const file of combinedFilterResult4.data) {
    TestValidator.predicate(
      "filename contains 'data'",
      file.name.toLowerCase().includes("data"),
    );
    TestValidator.predicate("file size is at least 20KB", file.size >= 20000);
  }

  // Step 8: Test pagination with combined filters
  const paginatedResult =
    await api.functional.discussionBoard.articles.files.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 3,
        extension: "pdf",
        min_size: 50000,
        sort_by: "size",
        sort_order: "desc",
      } satisfies IDiscussionBoardArticleFile.IRequest,
    });
  typia.assert(paginatedResult);

  TestValidator.predicate(
    "pagination limit respected",
    paginatedResult.data.length <= 3,
  );
  TestValidator.predicate(
    "pagination metadata is valid",
    paginatedResult.pagination.current === 1 &&
      paginatedResult.pagination.limit === 3,
  );

  // Step 9: Test edge case - very restrictive filters that may return no results
  const restrictiveResult =
    await api.functional.discussionBoard.articles.files.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
        search: "nonexistent_keyword_xyz",
        extension: "pdf",
        min_size: 1000000,
        max_size: 2000000,
      } satisfies IDiscussionBoardArticleFile.IRequest,
    });
  typia.assert(restrictiveResult);

  TestValidator.predicate(
    "restrictive filters can return empty results",
    restrictiveResult.data.length === 0 ||
      restrictiveResult.data.every(
        (f) =>
          f.name.toLowerCase().includes("nonexistent_keyword_xyz") &&
          f.extension === "pdf" &&
          f.size >= 1000000 &&
          f.size <= 2000000,
      ),
  );
}
