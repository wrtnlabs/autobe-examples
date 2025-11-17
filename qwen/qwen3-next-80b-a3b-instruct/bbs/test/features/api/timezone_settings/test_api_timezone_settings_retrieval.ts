import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardTimezoneSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTimezoneSetting";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardTimezoneSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardTimezoneSetting";

export async function test_api_timezone_settings_retrieval(
  connection: api.IConnection,
) {
  const output: IPageIEconomicBoardTimezoneSetting =
    await api.functional.economicBoard.settings.timezones.index(connection);
  typia.assert(output);
  TestValidator.equals(
    "pagination has correct current page",
    output.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination has correct limit",
    output.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "pagination has records greater than 0",
    output.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination has at least one page",
    output.pagination.pages >= 1,
  );
  TestValidator.predicate("data array is not empty", output.data.length > 0);

  // Verify the system default timezone 'Asia/Seoul' is in the list
  TestValidator.predicate(
    "Asia/Seoul timezone is in the response",
    output.data.includes("Asia/Seoul"),
  );
}
