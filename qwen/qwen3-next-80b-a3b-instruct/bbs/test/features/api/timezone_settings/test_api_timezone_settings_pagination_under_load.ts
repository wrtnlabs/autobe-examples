import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardTimezoneSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTimezoneSetting";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardTimezoneSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardTimezoneSetting";

export async function test_api_timezone_settings_pagination_under_load(
  connection: api.IConnection,
) {
  // Get all timezone settings
  const result: IPageIEconomicBoardTimezoneSetting =
    await api.functional.economicBoard.settings.timezones.index(connection);
  typia.assert(result);

  // Validate that data exists and is an array
  TestValidator.predicate("data array is not empty", result.data.length > 0);

  // Validate pagination metadata
  TestValidator.predicate(
    "current page is at least 1",
    result.pagination.current >= 1,
  );
  TestValidator.predicate("limit is at least 1", result.pagination.limit >= 1);
  TestValidator.predicate(
    "records count is at least 1",
    result.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pages count is at least 1",
    result.pagination.pages >= 1,
  );

  // Validate pagination formula: pages = ceil(records / limit)
  const calculatedPages = Math.ceil(
    result.pagination.records / result.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation is correct",
    result.pagination.pages,
    calculatedPages,
  );

  // Validate that data array length equals records count
  TestValidator.equals(
    "data length equals records count",
    result.data.length,
    result.pagination.records,
  );

  // Validate that each record is a valid timezone string (non-empty string)
  TestValidator.predicate(
    "all data items are non-empty strings",
    result.data.every((item) => typeof item === "string" && item.length > 0),
  );
}
