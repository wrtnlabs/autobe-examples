import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_images_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection and join
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(user);
  // Create an article for testing using utility function
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 8,
        }),
        content: RandomGenerator.paragraph({ sentences: 3 }),
        status: "published" as const,
      },
    },
  );
  typia.assert(article);
  // Note: Since there's no API to create article images in the provided utilities,
  // we'll test the pagination behavior with the empty state and validate the pagination metadata
  // Test 1: Minimal page size (limit=1)
  const page1 = await api.functional.discussionBoard.articles.images.index(
    userConnection,
    {
      articleId: article.id,
      body: {
        page: 1,
        limit: 1,
      } satisfies IDiscussionBoardArticleImage.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals(
    "page 1 has pagination data",
    typeof page1.pagination,
    "object",
  );
  TestValidator.predicate("current page is 1", page1.pagination.current === 1);
  TestValidator.predicate("limit is 1", page1.pagination.limit === 1);
  // Test 2: Page beyond available records
  const beyondPage = await api.functional.discussionBoard.articles.images.index(
    userConnection,
    {
      articleId: article.id,
      body: {
        page: 1000,
        limit: 10,
      } satisfies IDiscussionBoardArticleImage.IRequest,
    },
  );
  typia.assert(beyondPage);
  TestValidator.predicate(
    "page beyond records returns empty array",
    beyondPage.data.length === 0,
  );
  TestValidator.predicate(
    "current page is 1000",
    beyondPage.pagination.current === 1000,
  );
  // Test 3: Different sorting orders
  const ascSorted = await api.functional.discussionBoard.articles.images.index(
    userConnection,
    {
      articleId: article.id,
      body: {
        sort: "display_order_asc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticleImage.IRequest,
    },
  );
  typia.assert(ascSorted);
  const descSorted = await api.functional.discussionBoard.articles.images.index(
    userConnection,
    {
      articleId: article.id,
      body: {
        sort: "display_order_desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticleImage.IRequest,
    },
  );
  typia.assert(descSorted);
  // Validate that sorting parameters are accepted without error
  TestValidator.predicate(
    "ascending sort request successful",
    ascSorted.pagination !== undefined,
  );
  TestValidator.predicate(
    "descending sort request successful",
    descSorted.pagination !== undefined,
  );
  // Test 4: Pagination metadata validation
  const paginationTest =
    await api.functional.discussionBoard.articles.images.index(userConnection, {
      articleId: article.id,
      body: {
        page: 2,
        limit: 5,
      } satisfies IDiscussionBoardArticleImage.IRequest,
    });
  typia.assert(paginationTest);
  TestValidator.predicate(
    "current page matches request",
    paginationTest.pagination.current === 2,
  );
  TestValidator.predicate(
    "limit matches request",
    paginationTest.pagination.limit === 5,
  );
  TestValidator.predicate(
    "records count is non-negative",
    paginationTest.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    paginationTest.pagination.pages >= 0,
  );
  // Validate pagination calculation
  if (paginationTest.pagination.records > 0) {
    const expectedPages = Math.ceil(
      paginationTest.pagination.records / paginationTest.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation is correct",
      paginationTest.pagination.pages,
      expectedPages,
    );
  }
  // Test 5: Boundary values
  const minLimit = await api.functional.discussionBoard.articles.images.index(
    userConnection,
    {
      articleId: article.id,
      body: {
        page: 1,
        limit: 1,
      } satisfies IDiscussionBoardArticleImage.IRequest,
    },
  );
  typia.assert(minLimit);
  TestValidator.predicate(
    "minimum limit works",
    minLimit.pagination.limit === 1,
  );
  const maxLimit = await api.functional.discussionBoard.articles.images.index(
    userConnection,
    {
      articleId: article.id,
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardArticleImage.IRequest,
    },
  );
  typia.assert(maxLimit);
  TestValidator.predicate(
    "maximum limit works",
    maxLimit.pagination.limit === 100,
  );
  // Test 6: Empty pagination scenario
  const emptyPage = await api.functional.discussionBoard.articles.images.index(
    userConnection,
    {
      articleId: article.id,
      body: {
        page: 1,
        limit: 10,
        status: "deleted", // Filter that should return no results
      } satisfies IDiscussionBoardArticleImage.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.predicate(
    "empty page returns empty data array",
    emptyPage.data.length === 0,
  );
  TestValidator.predicate(
    "empty page has valid pagination",
    emptyPage.pagination.records >= 0,
  );
}
