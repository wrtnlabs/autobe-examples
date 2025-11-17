import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardTimezoneSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTimezoneSetting";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardTimezoneSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardTimezoneSetting";

export async function test_api_timezone_settings_empty_collection(
  connection: api.IConnection,
) {
  const response: IPageIEconomicBoardTimezoneSetting =
    await api.functional.economicBoard.settings.timezones.index(connection);
  typia.assert(response);
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
  TestValidator.predicate(
    "pagination current should be 0",
    () => response.pagination.current === 0,
  );
  TestValidator.predicate(
    "pagination limit should be non-negative",
    () => response.pagination.limit >= 0,
  );
}
