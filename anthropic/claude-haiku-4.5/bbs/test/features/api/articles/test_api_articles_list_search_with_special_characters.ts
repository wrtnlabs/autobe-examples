import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

export async function test_api_articles_list_search_with_special_characters(
  connection: api.IConnection,
) {
  /** Test 1: Search with special characters - basic symbols */
  const specialCharQueries = [
    "@#$%",
    "test@example.com",
    "hello-world",
    "test_case",
    "query.with.dots",
  ] as const;

  for (const query of specialCharQueries) {
    const result: IPageIDiscussionBoardArticle.ISummary =
      await api.functional.discussionBoard.articles.index(connection, {
        body: {
          search: query,
        } satisfies IDiscussionBoardArticle.IRequest,
      });
    typia.assert(result);
    TestValidator.predicate(
      `search with special characters "${query}" returns valid pagination`,
      result.pagination.current >= 0 && result.pagination.limit >= 0,
    );
  }

  /** Test 2: Case-insensitive search with mixed case special characters */
  const mixedCaseQueries = [
    "TEST@EXAMPLE",
    "Hello-World",
    "QUERY_CASE",
  ] as const;

  for (const query of mixedCaseQueries) {
    const result: IPageIDiscussionBoardArticle.ISummary =
      await api.functional.discussionBoard.articles.index(connection, {
        body: {
          search: query,
        } satisfies IDiscussionBoardArticle.IRequest,
      });
    typia.assert(result);
    TestValidator.predicate(
      `case-insensitive search with "${query}" maintains pagination integrity`,
      result.data.every(
        (article) => typeof article.id === "string" && article.id.length > 0,
      ),
    );
  }

  /** Test 3: Unicode and extended special characters */
  const unicodeQueries = ["café", "naïve", "日本語", "한글"] as const;

  for (const query of unicodeQueries) {
    const result: IPageIDiscussionBoardArticle.ISummary =
      await api.functional.discussionBoard.articles.index(connection, {
        body: {
          search: query,
        } satisfies IDiscussionBoardArticle.IRequest,
      });
    typia.assert(result);
    TestValidator.predicate(
      `unicode character search "${query}" returns valid results`,
      Array.isArray(result.data),
    );
  }

  /** Test 4: Special characters combined with pagination */
  const complexQuery = "test@query_123.abc" as const;
  const result1: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        search: complexQuery,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(result1);
  TestValidator.equals(
    "pagination page matches request",
    result1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    result1.pagination.limit,
    10,
  );

  /** Test 5: Bracket and parenthesis characters */
  const bracketQueries = ["(test)", "[query]", "{data}", "test()"] as const;

  for (const query of bracketQueries) {
    const result: IPageIDiscussionBoardArticle.ISummary =
      await api.functional.discussionBoard.articles.index(connection, {
        body: {
          search: query,
        } satisfies IDiscussionBoardArticle.IRequest,
      });
    typia.assert(result);
    TestValidator.predicate(
      `bracket characters in search "${query}" handled correctly`,
      result.pagination.pages >= 0,
    );
  }

  /** Test 6: Search with minimal special characters - single character */
  const minimalQueries = ["@", "#", "$", "&", "*", "^"] as const;

  for (const query of minimalQueries) {
    const result: IPageIDiscussionBoardArticle.ISummary =
      await api.functional.discussionBoard.articles.index(connection, {
        body: {
          search: query,
        } satisfies IDiscussionBoardArticle.IRequest,
      });
    typia.assert(result);
    TestValidator.predicate(
      `single special character "${query}" search returns results`,
      typeof result.pagination.records === "number",
    );
  }

  /** Test 7: Multiple filters combined with special character search */
  const multiFilterResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        search: "test@special#chars",
        status: "published",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(multiFilterResult);
  TestValidator.equals(
    "multi-filter search maintains correct page number",
    multiFilterResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "multi-filter search returns data array",
    Array.isArray(multiFilterResult.data),
  );

  /** Test 8: Regex escape characters in search query */
  const regexCharQueries = [
    "test.*",
    "query.+",
    "pattern|alternative",
    "text\\slash",
  ] as const;

  for (const query of regexCharQueries) {
    const result: IPageIDiscussionBoardArticle.ISummary =
      await api.functional.discussionBoard.articles.index(connection, {
        body: {
          search: query,
        } satisfies IDiscussionBoardArticle.IRequest,
      });
    typia.assert(result);
    TestValidator.predicate(
      `regex escape character "${query}" handled safely`,
      result.pagination !== undefined,
    );
  }

  /** Test 9: Verify data integrity in results */
  const integrityResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        search: "special@chars#test",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(integrityResult);
  TestValidator.predicate(
    "all returned articles have valid IDs",
    integrityResult.data.every(
      (article) => typeof article.id === "string" && article.id.length > 0,
    ),
  );
  TestValidator.predicate(
    "all returned articles have titles",
    integrityResult.data.every((article) => typeof article.title === "string"),
  );
}
