import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardTimezoneSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTimezoneSetting";

export async function test_api_timezone_setting_retrieval_by_valid_code(
  connection: api.IConnection,
) {
  const timezoneCode = "KST";
  const result = await api.functional.economicBoard.settings.timezones.at(
    connection,
    { timezoneCode },
  );
  typia.assert(result);
}
