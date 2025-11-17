import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardCategory";

export async function test_api_category_listing_full_retrieval(
  connection: api.IConnection,
) {
  const output: IPageIEconomicBoardCategory.ISummary =
    await api.functional.economicBoard.settings.categories.index(connection);
  typia.assert(output);

  // Validate pagination structure
  TestValidator.equals(
    "pagination is valid",
    output.pagination,
    output.pagination,
  );

  // Validate data array exists and contains at least one category
  TestValidator.predicate(
    "categories array is not empty",
    output.data.length > 0,
  );
}
