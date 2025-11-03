import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

export async function test_api_category_articles_pagination(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator to gain permissions for category and article creation
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a test category to organize articles under
  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: `Test Category ${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create 25 articles to test pagination across multiple pages
  const articleCount = 25;
  const createdArticles: IDiscussionBoardArticle[] = [];

  for (let i = 0; i < articleCount; i++) {
    const article: IDiscussionBoardArticle =
      await api.functional.discussionBoard.moderator.articles.create(
        connection,
        {
          body: {
            title: `Article ${i + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
            body: RandomGenerator.content({ paragraphs: 3 }),
            summary: RandomGenerator.paragraph({ sentences: 3 }),
            category_ids: [category.id],
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    typia.assert(article);
    createdArticles.push(article);
  }

  // Step 4: Test pagination with page size of 10 (should result in 3 pages: 10, 10, 5)
  const pageSize = 10;

  // Retrieve first page
  const page1: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.categories.articles.index(connection, {
      categorySlug: category.slug,
      body: {
        page: 1,
        limit: pageSize,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(page1);

  // Validate first page pagination metadata
  TestValidator.equals("first page current", page1.pagination.current, 1);
  TestValidator.equals("first page limit", page1.pagination.limit, pageSize);
  TestValidator.equals(
    "first page total records",
    page1.pagination.records,
    articleCount,
  );
  TestValidator.equals("first page total pages", page1.pagination.pages, 3);
  TestValidator.equals("first page data count", page1.data.length, pageSize);

  // Retrieve second page
  const page2: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.categories.articles.index(connection, {
      categorySlug: category.slug,
      body: {
        page: 2,
        limit: pageSize,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(page2);

  // Validate second page pagination metadata
  TestValidator.equals("second page current", page2.pagination.current, 2);
  TestValidator.equals("second page limit", page2.pagination.limit, pageSize);
  TestValidator.equals(
    "second page total records",
    page2.pagination.records,
    articleCount,
  );
  TestValidator.equals("second page total pages", page2.pagination.pages, 3);
  TestValidator.equals("second page data count", page2.data.length, pageSize);

  // Retrieve third page (partial page with 5 articles)
  const page3: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.categories.articles.index(connection, {
      categorySlug: category.slug,
      body: {
        page: 3,
        limit: pageSize,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(page3);

  // Validate third page pagination metadata
  TestValidator.equals("third page current", page3.pagination.current, 3);
  TestValidator.equals("third page limit", page3.pagination.limit, pageSize);
  TestValidator.equals(
    "third page total records",
    page3.pagination.records,
    articleCount,
  );
  TestValidator.equals("third page total pages", page3.pagination.pages, 3);
  TestValidator.equals("third page data count", page3.data.length, 5);

  // Step 5: Verify no duplicates across pages
  const allArticleIds = [
    ...page1.data.map((a) => a.id),
    ...page2.data.map((a) => a.id),
    ...page3.data.map((a) => a.id),
  ];

  const uniqueArticleIds = new Set(allArticleIds);
  TestValidator.equals(
    "no duplicate articles",
    uniqueArticleIds.size,
    articleCount,
  );
  TestValidator.equals(
    "all articles retrieved",
    allArticleIds.length,
    articleCount,
  );

  // Step 6: Test with different page size (20 articles per page - should result in 2 pages: 20, 5)
  const largePage1: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.categories.articles.index(connection, {
      categorySlug: category.slug,
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(largePage1);

  TestValidator.equals(
    "large page 1 current",
    largePage1.pagination.current,
    1,
  );
  TestValidator.equals("large page 1 limit", largePage1.pagination.limit, 20);
  TestValidator.equals(
    "large page 1 total records",
    largePage1.pagination.records,
    articleCount,
  );
  TestValidator.equals(
    "large page 1 total pages",
    largePage1.pagination.pages,
    2,
  );
  TestValidator.equals("large page 1 data count", largePage1.data.length, 20);

  const largePage2: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.categories.articles.index(connection, {
      categorySlug: category.slug,
      body: {
        page: 2,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(largePage2);

  TestValidator.equals(
    "large page 2 current",
    largePage2.pagination.current,
    2,
  );
  TestValidator.equals("large page 2 limit", largePage2.pagination.limit, 20);
  TestValidator.equals(
    "large page 2 total records",
    largePage2.pagination.records,
    articleCount,
  );
  TestValidator.equals(
    "large page 2 total pages",
    largePage2.pagination.pages,
    2,
  );
  TestValidator.equals("large page 2 data count", largePage2.data.length, 5);

  // Step 7: Test with smaller page size (5 articles per page - should result in 5 pages)
  const smallPage1: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.categories.articles.index(connection, {
      categorySlug: category.slug,
      body: {
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(smallPage1);

  TestValidator.equals(
    "small page total pages",
    smallPage1.pagination.pages,
    5,
  );
  TestValidator.equals("small page 1 data count", smallPage1.data.length, 5);
}
