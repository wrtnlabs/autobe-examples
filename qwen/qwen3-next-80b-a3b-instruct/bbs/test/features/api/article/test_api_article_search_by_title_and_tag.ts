import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_article_search_by_title_and_tag(
  connection: api.IConnection,
): Promise<void> {
  // Direct search using documented API parameters since IRequest is empty
  const searchBody = {
    search: "inflation",
    tags: ["economics"],
    page: 1,
    limit: 20,
    sort_by: "newest",
  };
  const searchResult = await api.functional.economicBoard.articles.index(
    connection,
    { body: searchBody },
  );
  typia.assert(searchResult);
  // Validate pagination structure
  TestValidator.equals(
    "pagination limit matches",
    searchResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination page is 1",
    searchResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "has at least one result",
    searchResult.data.length > 0,
  );
  TestValidator.predicate(
    "total records > 0",
    searchResult.pagination.records > 0,
  );
  TestValidator.predicate("pages >= 1", searchResult.pagination.pages >= 1);
  // Validate each result item is an empty object as per IEconomicBoardArticle.ISum definition
  // Since ISum is {}, we can only assert that each item is an object
  for (const item of searchResult.data) {
    TestValidator.predicate(
      "each result item is an object",
      typeof item === "object" && item !== null,
    );
    // We cannot assert on title, tags, or created_at because they don't exist in ISum
    // This is a fundamental discrepancy between scenario and API contract
  }
}
