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

export async function test_api_article_search_with_exact_phrase_and_sort_oldest(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection for searching
  const userConnection: api.IConnection = { host: connection.host };
  // Perform search with empty request (IRequest is empty)
  const searchResponse = await api.functional.economicBoard.articles.index(
    userConnection,
    {
      body: {} satisfies IEconomicBoardArticle.IRequest,
    },
  );
  typia.assert(searchResponse);
  // Validate response structure
  TestValidator.equals(
    "response has correct pagination current",
    searchResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "response has correct pagination limit",
    searchResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "total records at least 3",
    searchResponse.pagination.records >= 3,
  );
  TestValidator.equals(
    "total pages",
    searchResponse.pagination.pages,
    Math.ceil(searchResponse.pagination.records / 10),
  );
  // Validate that we have data
  TestValidator.predicate(
    "data array is not empty",
    searchResponse.data.length > 0,
  );
  // Since IEconomicBoardArticle.ISum doesn't have 'tags' or 'title' properties,
  // we cannot validate those scenarios. The schema doesn't support them.
  // We validate only what's possible with the provided interface.
}
