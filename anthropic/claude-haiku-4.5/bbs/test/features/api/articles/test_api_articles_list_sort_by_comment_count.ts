import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

export async function test_api_articles_list_sort_by_comment_count(
  connection: api.IConnection,
) {
  // Test article list sorting by comment count
  // Create multiple article requests with different sorting parameters

  // Test 1: Sort by commentCount in descending order (default)
  const requestDesc = {
    orderBy: "commentCount",
    order: "desc",
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardArticle.IRequest;

  const resultDesc: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: requestDesc,
    });
  typia.assert(resultDesc);

  TestValidator.predicate(
    "descending result should have pagination data",
    resultDesc.pagination !== null && resultDesc.pagination !== undefined,
  );
  TestValidator.predicate(
    "descending result should have article data",
    resultDesc.data !== null && resultDesc.data !== undefined,
  );

  // Test 2: Sort by commentCount in ascending order
  const requestAsc = {
    orderBy: "commentCount",
    order: "asc",
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardArticle.IRequest;

  const resultAsc: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: requestAsc,
    });
  typia.assert(resultAsc);

  TestValidator.predicate(
    "ascending result should have pagination data",
    resultAsc.pagination !== null && resultAsc.pagination !== undefined,
  );
  TestValidator.predicate(
    "ascending result should have article data",
    resultAsc.data !== null && resultAsc.data !== undefined,
  );

  // Test 3: Verify pagination details
  TestValidator.predicate(
    "current page should be valid",
    resultDesc.pagination.current > 0,
  );
  TestValidator.predicate(
    "limit should be positive",
    resultDesc.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count should be non-negative",
    resultDesc.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count should be non-negative",
    resultDesc.pagination.pages >= 0,
  );

  // Test 4: Test with different pagination parameters
  const requestPage2 = {
    orderBy: "commentCount",
    order: "desc",
    page: 2,
    limit: 5,
  } satisfies IDiscussionBoardArticle.IRequest;

  const resultPage2: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: requestPage2,
    });
  typia.assert(resultPage2);

  TestValidator.equals(
    "page 2 request should return page 2",
    resultPage2.pagination.current,
    2,
  );

  // Test 5: Test with null sort order (should use default)
  const requestDefault = {
    orderBy: "commentCount",
    order: null,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardArticle.IRequest;

  const resultDefault: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: requestDefault,
    });
  typia.assert(resultDefault);

  TestValidator.predicate(
    "default sort result should have data",
    resultDefault.data !== null && resultDefault.data !== undefined,
  );
}
