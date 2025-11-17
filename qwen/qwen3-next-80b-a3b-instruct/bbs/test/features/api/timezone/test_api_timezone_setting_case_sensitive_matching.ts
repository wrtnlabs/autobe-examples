import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardTimezoneSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTimezoneSetting";

export async function test_api_timezone_setting_case_sensitive_matching(
  connection: api.IConnection,
) {
  // Generate a valid timezone code with mixed case
  const validTimezoneCode = "KSt";

  // First, attempt to retrieve the timezone with exact case-sensitive match
  const result = await api.functional.economicBoard.settings.timezones.at(
    connection,
    {
      timezoneCode: validTimezoneCode,
    },
  );
  typia.assert(result);

  // Validate that the returned timezone setting is not null/undefined
  TestValidator.predicate(
    "timezone setting should be returned",
    result !== null,
  );

  // Test case-sensitive matching by attempting to retrieve with different case variation
  const wrongCaseTimezoneCode = "KST";
  await TestValidator.error(
    "timezone retrieval should fail with wrong case",
    async () => {
      await api.functional.economicBoard.settings.timezones.at(connection, {
        timezoneCode: wrongCaseTimezoneCode,
      });
    },
  );

  // Test another case variation to confirm case sensitivity
  const anotherWrongCase = "kst";
  await TestValidator.error(
    "timezone retrieval should fail with all lowercase",
    async () => {
      await api.functional.economicBoard.settings.timezones.at(connection, {
        timezoneCode: anotherWrongCase,
      });
    },
  );
}
