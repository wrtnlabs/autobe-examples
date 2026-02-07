import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_articles_files_create } from "../../../generate/generate_random_discussion_board_user_articles_files_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

/**
 * Test advanced filtering capabilities for article file attachments.
 * Create an article with various file types uploaded at different times.
 * Test filtering by file type, filename pattern matching, and creation date ranges.
 * Verify that the API correctly applies AND logic when multiple filters are combined.
 */
export async function test_api_article_file_attachments_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Create an article for file attachment testing
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 8,
        }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Upload diverse file types with different names and timestamps
  const fileTypes = [
    { type: "application/pdf", name: "report_2024.pdf" },
    { type: "image/jpeg", name: "photo_profile.jpg" },
    {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      name: "document_report.docx",
    },
    { type: "application/pdf", name: "financial_report.pdf" },
    { type: "image/png", name: "chart_image.png" },
  ];
  const uploadedFiles: IDiscussionBoardArticleFile[] = [];
  const creationTimes: string[] = [];
  for (const fileInfo of fileTypes) {
    const file =
      await generate_random_discussion_board_user_articles_files_create(
        userConnection,
        {
          params: { articleId: article.id },
          body: {
            file_name: fileInfo.name,
            file_type: fileInfo.type,
            file_size: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<1000> &
                tags.Maximum<5000000>
            >(),
            storage_path: `/uploads/${typia.random<string & tags.Format<"uuid">>()}/${fileInfo.name}`,
            description: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IDiscussionBoardArticleFile.ICreate,
        },
      );
    typia.assert(file);
    uploadedFiles.push(file);
    creationTimes.push(file.createdAt); // Fixed: changed 'created_at' to 'createdAt'
  }
  // Sort creation times to use for date filtering
  creationTimes.sort();
  // Test 1: Filter by file type (PDF only)
  const pdfFiles = await api.functional.discussionBoard.articles.files.index(
    userConnection,
    {
      articleId: article.id,
      body: {
        file_type: "application/pdf",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticleFile.IRequest,
    },
  );
  typia.assert(pdfFiles);
  TestValidator.equals("PDF files count", pdfFiles.data.length, 2);
  TestValidator.predicate(
    "All PDF files",
    pdfFiles.data.every((f) => f.file_type === "application/pdf"),
  );
  // Test 2: Filter by filename pattern (report*)
  const reportFiles = await api.functional.discussionBoard.articles.files.index(
    userConnection,
    {
      articleId: article.id,
      body: {
        search: "report",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticleFile.IRequest,
    },
  );
  typia.assert(reportFiles);
  TestValidator.predicate("Report files found", reportFiles.data.length > 0);
  TestValidator.predicate(
    "All report files contain 'report' in name",
    reportFiles.data.every((f) => f.file_name.toLowerCase().includes("report")),
  );
  // Test 3: Filter by date range (get files created after second file)
  if (creationTimes.length > 1) {
    const laterFiles =
      await api.functional.discussionBoard.articles.files.index(
        userConnection,
        {
          articleId: article.id,
          body: {
            created_at_start: creationTimes[1],
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardArticleFile.IRequest,
        },
      );
    typia.assert(laterFiles);
    TestValidator.predicate("Later files exist", laterFiles.data.length >= 1);
  }
  // Test 4: Combined filters (PDF files containing 'report')
  const pdfReportFiles =
    await api.functional.discussionBoard.articles.files.index(userConnection, {
      articleId: article.id,
      body: {
        file_type: "application/pdf",
        search: "report",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticleFile.IRequest,
    });
  typia.assert(pdfReportFiles);
  TestValidator.equals("PDF report files count", pdfReportFiles.data.length, 2);
  TestValidator.predicate(
    "All PDF report files",
    pdfReportFiles.data.every(
      (f) =>
        f.file_type === "application/pdf" &&
        f.file_name.toLowerCase().includes("report"),
    ),
  );
  // Test 5: Empty search pattern (should return all files)
  const allFiles = await api.functional.discussionBoard.articles.files.index(
    userConnection,
    {
      articleId: article.id,
      body: {
        search: "",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticleFile.IRequest,
    },
  );
  typia.assert(allFiles);
  TestValidator.equals(
    "All files with empty search",
    allFiles.data.length,
    uploadedFiles.length,
  );
  // Test 6: Non-matching file type
  const nonMatchingFiles =
    await api.functional.discussionBoard.articles.files.index(userConnection, {
      articleId: article.id,
      body: {
        file_type: "application/zip",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticleFile.IRequest,
    });
  typia.assert(nonMatchingFiles);
  TestValidator.equals(
    "No files for non-matching type",
    nonMatchingFiles.data.length,
    0,
  );
  // Test 7: Date range with no files
  const futureFiles = await api.functional.discussionBoard.articles.files.index(
    userConnection,
    {
      articleId: article.id,
      body: {
        created_at_start: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticleFile.IRequest,
    },
  );
  typia.assert(futureFiles);
  TestValidator.equals(
    "No files in future date range",
    futureFiles.data.length,
    0,
  );
  // Test 8: Verify pagination works correctly
  const paginatedFiles =
    await api.functional.discussionBoard.articles.files.index(userConnection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardArticleFile.IRequest,
    });
  typia.assert(paginatedFiles);
  TestValidator.equals(
    "Pagination limit respected",
    paginatedFiles.data.length,
    2,
  );
  TestValidator.predicate(
    "Pagination metadata correct",
    paginatedFiles.pagination.limit === 2 &&
      paginatedFiles.pagination.current === 1 &&
      paginatedFiles.pagination.records >= uploadedFiles.length,
  );
}