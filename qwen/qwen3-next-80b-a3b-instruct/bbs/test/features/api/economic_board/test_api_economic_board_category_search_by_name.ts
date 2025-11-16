import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardEconomicBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardEconomicBoardCategory";
import type { IPageIEconomicBoardEconomicBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardEconomicBoardCategory";

export async function test_api_economic_board_category_search_by_name(
  connection: api.IConnection,
) {
  // Generate a random search term that complies with the IRequest type (string)
  const searchTerm = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 20,
  });

  // Perform the search operation with the generated term as string body
  const result: IPageIEconomicBoardEconomicBoardCategory =
    await api.functional.economicBoard._search.categories.index(connection, {
      body: searchTerm,
    });

  // Validate the response type: IPageIEconomicBoardEconomicBoardCategory is defined as string
  typia.assert(result);

  // Verify response is a non-empty string
  TestValidator.predicate(
    "search result is a non-empty string",
    result.length > 0,
  );
}
