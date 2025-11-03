import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

export async function test_api_discussion_board_article_list_public_access(
  connection: api.IConnection,
) {
  // Test retrieving the first page with default parameters
  const requestBody1: IDiscussionBoardArticle.IRequest = {
    page: 1,
    limit: 10,
    search_text: null,
    sort: null,
    order: null,
  };
  const page1 =
    await api.functional.discussionBoard.discussionBoardArticles.index(
      connection,
      {
        body: requestBody1,
      },
    );
  typia.assert(page1);

  // Check pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    page1.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    page1.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    page1.pagination.pages >= 0,
  );

  // Assert all returned articles are active (deleted_at is null or missing)
  for (const article of page1.data) {
    typia.assert(article);
    TestValidator.predicate(
      "each article deleted_at is null or undefined",
      article.deleted_at === null || article.deleted_at === undefined,
    );
  }

  // Test retrieving page 2 without search or sort
  const requestBody2: IDiscussionBoardArticle.IRequest = {
    page: 2,
    limit: 5,
    search_text: null,
    sort: null,
    order: null,
  };
  const page2 =
    await api.functional.discussionBoard.discussionBoardArticles.index(
      connection,
      {
        body: requestBody2,
      },
    );
  typia.assert(page2);
  TestValidator.predicate(
    "pagination current page is 2",
    page2.pagination.current === 2,
  );
  TestValidator.predicate(
    "pagination limit is 5",
    page2.pagination.limit === 5,
  );

  // Test searching with search_text
  const searchText =
    page1.data.length > 0 ? page1.data[0].title.split(" ")[0] : "test";
  const requestBody3: IDiscussionBoardArticle.IRequest = {
    page: 1,
    limit: 10,
    search_text: searchText,
    sort: "created_at",
    order: "desc",
  };
  const searchResult =
    await api.functional.discussionBoard.discussionBoardArticles.index(
      connection,
      {
        body: requestBody3,
      },
    );
  typia.assert(searchResult);

  // All articles in search results should contain the search text in title or satisfy search
  for (const article of searchResult.data) {
    typia.assert(article);
    TestValidator.predicate(
      `article title includes search text '${searchText}'`,
      article.title.includes(searchText),
    );
    TestValidator.predicate(
      "article deleted_at is null or undefined",
      article.deleted_at === null || article.deleted_at === undefined,
    );
  }

  // Test sorting asc and desc
  const requestBodyAsc: IDiscussionBoardArticle.IRequest = {
    page: 1,
    limit: 10,
    search_text: null,
    sort: "title",
    order: "asc",
  };
  const resultAsc =
    await api.functional.discussionBoard.discussionBoardArticles.index(
      connection,
      {
        body: requestBodyAsc,
      },
    );
  typia.assert(resultAsc);

  const sortedAsc = [...resultAsc.data].sort((a, b) =>
    a.title.localeCompare(b.title),
  );
  TestValidator.equals(
    "articles sorted ascending by title",
    resultAsc.data,
    sortedAsc,
  );

  const requestBodyDesc: IDiscussionBoardArticle.IRequest = {
    page: 1,
    limit: 10,
    search_text: null,
    sort: "title",
    order: "desc",
  };
  const resultDesc =
    await api.functional.discussionBoard.discussionBoardArticles.index(
      connection,
      {
        body: requestBodyDesc,
      },
    );
  typia.assert(resultDesc);

  const sortedDesc = [...resultDesc.data].sort((a, b) =>
    b.title.localeCompare(a.title),
  );
  TestValidator.equals(
    "articles sorted descending by title",
    resultDesc.data,
    sortedDesc,
  );
}
