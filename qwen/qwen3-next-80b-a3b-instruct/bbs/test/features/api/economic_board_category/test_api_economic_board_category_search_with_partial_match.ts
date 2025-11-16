import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardEconomicBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardEconomicBoardCategory";
import type { IPageIEconomicBoardEconomicBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardEconomicBoardCategory";

export async function test_api_economic_board_category_search_with_partial_match(
  connection: api.IConnection,
) {
  // Generate random search keyword for partial matching
  const searchKeyword = RandomGenerator.alphabets(2); // e.g., "ec"

  // Execute search with partial keyword matching - using only provided string types
  const result: IPageIEconomicBoardEconomicBoardCategory =
    await api.functional.economicBoard._search.categories.index(connection, {
      body: searchKeyword satisfies IEconomicBoardEconomicBoardCategory.IRequest,
    });

  // Validate that result is properly structured as string type
  typia.assert(result);

  // Verify result is not empty
  TestValidator.predicate("search result is not empty", result.length > 0);
}
