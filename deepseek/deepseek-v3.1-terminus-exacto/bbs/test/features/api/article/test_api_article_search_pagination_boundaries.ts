import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
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

export async function test_api_article_search_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Create a user connection for article creation and search
  const userConnection: api.IConnection = { host: connection.host };
  // Register and authenticate a user
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create multiple articles to test pagination
  const articleCount = 25;
  const articles: IDiscussionBoardArticle[] = [];
  for (let i = 0; i < articleCount; i++) {
    const article = await generate_random_discussion_board_user_articles_create(
      userConnection,
      {
        body: {
          title: `Test Article ${i + 1} - ${RandomGenerator.paragraph({ sentences: 1 })}`,
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
    articles.push(article);
  }
  // Test 1: Default pagination (page 1, default limit)
  const defaultPage = await api.functional.discussionBoard.user.articles.index(
    userConnection,
    {
      body: {
        page: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(defaultPage);
  TestValidator.equals(
    "default page should have data",
    defaultPage.data.length > 0,
    true,
  );
  TestValidator.predicate(
    "default pagination metadata should be valid",
    defaultPage.pagination.current === 1 &&
      defaultPage.pagination.records === articleCount &&
      defaultPage.pagination.pages > 0,
  );
  // Test 2: First page with explicit limit
  const firstPage = await api.functional.discussionBoard.user.articles.index(
    userConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page should have correct number of articles",
    firstPage.data.length,
    10,
  );
  TestValidator.equals(
    "first page current page should be 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit should be 10",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "first page total records should match",
    firstPage.pagination.records,
    articleCount,
  );
  TestValidator.equals(
    "first page total pages should be correct",
    firstPage.pagination.pages,
    Math.ceil(articleCount / 10),
  );
  // Test 3: Second page
  const secondPage = await api.functional.discussionBoard.user.articles.index(
    userConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(secondPage);
  TestValidator.equals(
    "second page should have correct number of articles",
    secondPage.data.length,
    10,
  );
  TestValidator.equals(
    "second page current page should be 2",
    secondPage.pagination.current,
    2,
  );
  // Test 4: Last page
  const lastPage = await api.functional.discussionBoard.user.articles.index(
    userConnection,
    {
      body: {
        page: Math.ceil(articleCount / 10),
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(lastPage);
  const expectedLastPageItems =
    articleCount % 10 === 0 ? 10 : articleCount % 10;
  TestValidator.equals(
    "last page should have correct number of articles",
    lastPage.data.length,
    expectedLastPageItems,
  );
  // Test 5: Page beyond available data (empty result)
  const beyondPage = await api.functional.discussionBoard.user.articles.index(
    userConnection,
    {
      body: {
        page: Math.ceil(articleCount / 10) + 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(beyondPage);
  TestValidator.equals(
    "page beyond available data should be empty",
    beyondPage.data.length,
    0,
  );
  TestValidator.equals(
    "beyond page current should be correct",
    beyondPage.pagination.current,
    Math.ceil(articleCount / 10) + 1,
  );
  TestValidator.equals(
    "beyond page records should still show total",
    beyondPage.pagination.records,
    articleCount,
  );
  // Test 6: Maximum limit (100 articles per page)
  const maxLimitPage = await api.functional.discussionBoard.user.articles.index(
    userConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "max limit page should have correct number of articles",
    maxLimitPage.data.length,
    articleCount,
  );
  TestValidator.equals(
    "max limit page limit should be 100",
    maxLimitPage.pagination.limit,
    100,
  );
  // Test 7: Empty result set with search term that matches nothing
  const emptyResult = await api.functional.discussionBoard.user.articles.index(
    userConnection,
    {
      body: {
        search: "nonexistent_search_term_that_will_not_match_anything",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty search result should have no articles",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty search result should have 0 records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search result should have 0 pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search result current page should be 1",
    emptyResult.pagination.current,
    1,
  );
  // Test 8: Verify pagination consistency across pages
  const allArticles: IDiscussionBoardArticle.ISummary[] = [];
  for (let pageNum = 1; pageNum <= Math.ceil(articleCount / 10); pageNum++) {
    const pageResult = await api.functional.discussionBoard.user.articles.index(
      userConnection,
      {
        body: {
          page: pageNum,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
    typia.assert(pageResult);
    allArticles.push(...pageResult.data);
  }
  TestValidator.equals(
    "all paginated articles should equal total count",
    allArticles.length,
    articleCount,
  );
  // Verify no duplicate articles across pages
  const articleIds = new Set(allArticles.map((article) => article.id));
  TestValidator.equals(
    "all article IDs should be unique across pages",
    articleIds.size,
    articleCount,
  );
}
