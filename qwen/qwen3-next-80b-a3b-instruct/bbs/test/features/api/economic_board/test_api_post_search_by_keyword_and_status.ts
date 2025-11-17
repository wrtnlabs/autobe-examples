import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardSearchMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSearchMetadata";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardPost";

export async function test_api_post_search_by_keyword_and_status(
  connection: api.IConnection,
) {
  // Test search with keyword and status filter
  const keyword = RandomGenerator.paragraph({ sentences: 3 });
  const status: IEconomicBoardSearchMetadata.IRequest = keyword;

  const searchResult: IPageIEconomicBoardPost.ISummary =
    await api.functional.economicBoard.search(connection, {
      body: status,
    });
  typia.assert(searchResult);

  // Validate pagination structure
  TestValidator.equals(
    "pagination properties exist",
    typeof searchResult.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination properties exist",
    typeof searchResult.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination properties exist",
    typeof searchResult.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination properties exist",
    typeof searchResult.pagination.pages,
    "number",
  );

  // Validate that data is array of summaries
  TestValidator.predicate(
    "data is array of summaries",
    Array.isArray(searchResult.data) &&
      searchResult.data.length >= 0 &&
      searchResult.data.every((item) => typeof item === "string"),
  );

  // Test empty keyword search
  const emptyKeyword: IEconomicBoardSearchMetadata.IRequest = "";
  const emptySearchResult: IPageIEconomicBoardPost.ISummary =
    await api.functional.economicBoard.search(connection, {
      body: emptyKeyword,
    });
  typia.assert(emptySearchResult);

  // Validate empty search returns at least one page
  TestValidator.equals(
    "empty search returns valid pagination",
    emptySearchResult.pagination.current,
    0,
  );
  TestValidator.predicate(
    "empty search returns valid data",
    Array.isArray(emptySearchResult.data),
  );

  // Test search with status filtering
  const publishedStatus: IEconomicBoardSearchMetadata.IRequest = "published";
  const publishedResult: IPageIEconomicBoardPost.ISummary =
    await api.functional.economicBoard.search(connection, {
      body: publishedStatus,
    });
  typia.assert(publishedResult);
  TestValidator.predicate(
    "published results are string summaries",
    publishedResult.data.every((item) => typeof item === "string"),
  );

  // Test invalid status
  const invalidStatus: IEconomicBoardSearchMetadata.IRequest = "invalid_status";
  const invalidResult: IPageIEconomicBoardPost.ISummary =
    await api.functional.economicBoard.search(connection, {
      body: invalidStatus,
    });
  typia.assert(invalidResult);
  TestValidator.predicate(
    "invalid status returns valid response",
    Array.isArray(invalidResult.data),
  );
}
