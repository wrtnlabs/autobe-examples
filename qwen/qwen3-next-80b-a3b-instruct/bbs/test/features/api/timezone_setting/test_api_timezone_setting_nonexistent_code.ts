import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardTimezoneSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTimezoneSetting";

export async function test_api_timezone_setting_nonexistent_code(
  connection: api.IConnection,
) {
  // Generate a completely random, non-existent timezone code
  const invalidTimezoneCode = `InvalidTimezone${RandomGenerator.alphaNumeric(8)}`;

  // Attempt to retrieve the non-existent timezone
  await TestValidator.error(
    "non-existent timezone code should return 404 error",
    async () => {
      await api.functional.economicBoard.settings.timezones.at(connection, {
        timezoneCode: invalidTimezoneCode,
      });
    },
  );
}
