import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

export async function test_api_article_comments_pagination_handling(
  connection: api.IConnection,
) {
  // 1. Authenticate and create a contributor
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: "TestPass@123",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // 2. Create an article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // 3. Test pagination with limit=1, page=1
  const page1Limit1: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 1,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(page1Limit1);
  TestValidator.equals(
    "pagination current page should be 1",
    page1Limit1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 1",
    page1Limit1.pagination.limit,
    1,
  );

  // 4. Test pagination with limit=10, page=1
  const page1Limit10: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(page1Limit10);
  TestValidator.equals(
    "pagination limit should be 10",
    page1Limit10.pagination.limit,
    10,
  );

  // 5. Test pagination with limit=20, page=1
  const page1Limit20: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(page1Limit20);
  TestValidator.equals(
    "pagination limit should be 20",
    page1Limit20.pagination.limit,
    20,
  );

  // 6. Test pagination with limit=50, page=1
  const page1Limit50: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(page1Limit50);
  TestValidator.equals(
    "pagination limit should be 50",
    page1Limit50.pagination.limit,
    50,
  );

  // 7. Test pagination with limit=100, page=1
  const page1Limit100: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(page1Limit100);
  TestValidator.equals(
    "pagination limit should be 100",
    page1Limit100.pagination.limit,
    100,
  );

  // 8. Verify pagination metadata consistency across all requests
  TestValidator.predicate(
    "pagination records should be non-negative",
    page1Limit1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be correctly calculated as ceil(records/limit)",
    page1Limit10.pagination.pages ===
      Math.ceil(
        page1Limit10.pagination.records / page1Limit10.pagination.limit,
      ),
  );
  TestValidator.predicate(
    "data array length should not exceed specified limit",
    page1Limit10.data.length <= page1Limit10.pagination.limit,
  );

  // 9. Test requesting a page beyond total pages
  const totalPages = page1Limit1.pagination.pages;
  if (totalPages > 0) {
    const beyondLastPage: IPageIDiscussionBoardComment.ISummary =
      await api.functional.discussionBoard.articles.comments.index(connection, {
        articleId: article.id,
        body: {
          page: totalPages + 10,
          limit: 10,
        } satisfies IDiscussionBoardComment.IRequest,
      });
    typia.assert(beyondLastPage);
    TestValidator.predicate(
      "data array should be empty when requesting page beyond total pages",
      beyondLastPage.data.length === 0,
    );
  }

  // 10. Verify pagination data accuracy for different limits
  TestValidator.predicate(
    "data array length should match expected records on first page",
    page1Limit10.data.length ===
      Math.min(page1Limit10.pagination.records, page1Limit10.pagination.limit),
  );
  TestValidator.predicate(
    "all pagination responses should have consistent record count",
    page1Limit1.pagination.records === page1Limit10.pagination.records,
  );
  TestValidator.predicate(
    "record count should match across all limit variations",
    page1Limit20.pagination.records === page1Limit50.pagination.records &&
      page1Limit50.pagination.records === page1Limit100.pagination.records,
  );

  // 11. Verify pages calculation is consistent for each limit
  TestValidator.predicate(
    "pages should be correctly calculated for each limit value",
    page1Limit1.pagination.pages ===
      Math.ceil(
        page1Limit1.pagination.records / page1Limit1.pagination.limit,
      ) &&
      page1Limit20.pagination.pages ===
        Math.ceil(
          page1Limit20.pagination.records / page1Limit20.pagination.limit,
        ) &&
      page1Limit50.pagination.pages ===
        Math.ceil(
          page1Limit50.pagination.records / page1Limit50.pagination.limit,
        ),
  );
}
