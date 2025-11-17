import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardCategory";

export async function test_api_category_listing_empty_dataset(
  connection: api.IConnection,
): Promise<void> {
  const response: IPageIEconomicBoardCategory.ISummary =
    await api.functional.economicBoard.settings.categories.index(connection);
  typia.assert(response);
  TestValidator.equals(
    "pagination current should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    response.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records should be 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    response.pagination.pages,
    0,
  );
  TestValidator.equals("data array should be empty", response.data.length, 0);
}
