import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleAttachment";

/**
 * Test attachment search functionality using partial filename matching to
 * locate specific supporting materials.
 *
 * This test validates the filename search feature for article attachments,
 * ensuring users can find specific documents and files within articles that
 * have multiple attachments. The test covers partial text matching,
 * case-insensitive searching, and proper handling of null/omitted search
 * parameters.
 *
 * Test workflow:
 *
 * 1. Moderator joins and creates a discussion category
 * 2. Member joins and creates an article in that category
 * 3. Upload multiple attachments with descriptive filenames
 *    (economic_data_2024.xlsx, market_analysis.pdf, GDP_chart.png,
 *    inflation_report.docx)
 * 4. Search with 'economic' - should return economic_data_2024.xlsx
 * 5. Search with 'chart' - should return GDP_chart.png
 * 6. Search with '2024' - should return economic_data_2024.xlsx
 * 7. Test case-insensitive matching with 'ECONOMIC'
 * 8. Search with null filename_search - should return all attachments
 * 9. Validate complete attachment metadata and pagination
 */
export async function test_api_article_attachments_search_by_filename(
  connection: api.IConnection,
) {
  // 1. Moderator joins to create category
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Create category for articles
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description: "Discussion of economic topics and analysis",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Member joins to create article and attachments
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "member123",
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 4. Create article for attachment hosting
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: "Economic Analysis Report 2024",
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // 5. Upload multiple attachments with searchable filenames
  const attachment1 =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: "file",
          format: "xlsx",
          size: 2048000,
          original_filename: "economic_data_2024.xlsx",
          storage_path: `/storage/attachments/${typia.random<string & tags.Format<"uuid">>()}.xlsx`,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(attachment1);

  const attachment2 =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: "file",
          format: "pdf",
          size: 3500000,
          original_filename: "market_analysis.pdf",
          storage_path: `/storage/attachments/${typia.random<string & tags.Format<"uuid">>()}.pdf`,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(attachment2);

  const attachment3 =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: "image",
          format: "png",
          size: 1200000,
          original_filename: "GDP_chart.png",
          storage_path: `/storage/attachments/${typia.random<string & tags.Format<"uuid">>()}.png`,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(attachment3);

  const attachment4 =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: "file",
          format: "docx",
          size: 800000,
          original_filename: "inflation_report.docx",
          storage_path: `/storage/attachments/${typia.random<string & tags.Format<"uuid">>()}.docx`,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(attachment4);

  // 6. Test search with 'economic' - should find economic_data_2024.xlsx
  const searchEconomic =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
          filename_search: "economic",
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(searchEconomic);
  TestValidator.equals(
    "search 'economic' returns 1 result",
    searchEconomic.pagination.records,
    1,
  );
  TestValidator.equals(
    "search 'economic' finds correct file",
    searchEconomic.data[0].original_filename,
    "economic_data_2024.xlsx",
  );

  // 7. Test search with 'chart' - should find GDP_chart.png
  const searchChart =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
          filename_search: "chart",
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(searchChart);
  TestValidator.equals(
    "search 'chart' returns 1 result",
    searchChart.pagination.records,
    1,
  );
  TestValidator.equals(
    "search 'chart' finds correct file",
    searchChart.data[0].original_filename,
    "GDP_chart.png",
  );

  // 8. Test search with '2024' - should find economic_data_2024.xlsx
  const search2024 =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
          filename_search: "2024",
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(search2024);
  TestValidator.equals(
    "search '2024' returns 1 result",
    search2024.pagination.records,
    1,
  );
  TestValidator.equals(
    "search '2024' finds correct file",
    search2024.data[0].original_filename,
    "economic_data_2024.xlsx",
  );

  // 9. Test case-insensitive search with 'ECONOMIC'
  const searchUppercase =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
          filename_search: "ECONOMIC",
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(searchUppercase);
  TestValidator.equals(
    "search 'ECONOMIC' is case-insensitive",
    searchUppercase.pagination.records,
    1,
  );
  TestValidator.equals(
    "uppercase search finds correct file",
    searchUppercase.data[0].original_filename,
    "economic_data_2024.xlsx",
  );

  // 10. Test null filename_search returns all attachments
  const searchNull =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
          filename_search: null,
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(searchNull);
  TestValidator.equals(
    "null search returns all 4 attachments",
    searchNull.pagination.records,
    4,
  );

  // 11. Test omitted filename_search returns all attachments
  const searchOmitted =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(searchOmitted);
  TestValidator.equals(
    "omitted search returns all 4 attachments",
    searchOmitted.pagination.records,
    4,
  );

  // 12. Test pagination with search filters
  const searchPaginated =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 2,
          filename_search: null,
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(searchPaginated);
  TestValidator.equals(
    "pagination limits results",
    searchPaginated.data.length,
    2,
  );
  TestValidator.equals(
    "pagination shows correct total",
    searchPaginated.pagination.records,
    4,
  );
  TestValidator.equals(
    "pagination calculates pages",
    searchPaginated.pagination.pages,
    2,
  );
}
