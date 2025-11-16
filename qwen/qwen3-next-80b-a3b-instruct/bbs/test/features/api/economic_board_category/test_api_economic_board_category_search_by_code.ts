import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardEconomicBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardEconomicBoardCategory";
import type { IPageIEconomicBoardEconomicBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardEconomicBoardCategory";

export async function test_api_economic_board_category_search_by_code(
  connection: api.IConnection,
) {
  // Generate a valid category code for testing
  const searchCode = "economy";

  // Execute the search operation with the category code
  const result: IPageIEconomicBoardEconomicBoardCategory =
    await api.functional.economicBoard._search.categories.index(connection, {
      body: searchCode satisfies IEconomicBoardEconomicBoardCategory.IRequest,
    });

  // Validate that the response structure is valid JSON string format and compatible with the contract
  typia.assert<IPageIEconomicBoardEconomicBoardCategory>(result);
}
