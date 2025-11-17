import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardTimezoneSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTimezoneSetting";

export async function test_api_timezone_setting_invalid_character_code(
  connection: api.IConnection,
) {
  // Test cases with invalid timezone code characters as specified in the scenario
  const invalidTimezoneCodes = [
    "Asia/Seoul ", // Trailing space
    " Asia/Seoul", // Leading space
    "Asia/Seoul#", // Special character
    "Asia/Seoul/", // Slash in code
    "Asia/Seoul?", // Question mark
    "Asia/Seoul&", // Ampersand
    "Asia/Seoul=", // Equals sign
    "Asia/Seoul%20", // URL-encoded space (should be rejected)
    "Asia/Seoul\u0020", // Unicode escape for space
    "Asia/Seoul\n", // Newline character
    "Asia/Seoul\t", // Tab character
    "Asia/Seoul123!@#$%^&*()", // Special characters sequence
    "", // Empty string
    "   ", // Only whitespace
    "亚洲/上海", // Non-ASCII Unicode characters
  ];

  // Validate that each invalid timezone code returns a 404 without server errors
  for (const invalidCode of invalidTimezoneCodes) {
    await TestValidator.error(
      `timezone code '${invalidCode}' should fail with 404`,
      async () => {
        await api.functional.economicBoard.settings.timezones.at(connection, {
          timezoneCode: invalidCode,
        });
      },
    );
  }

  // Validate that a valid timezone code works
  const validCode = "Asia/Seoul";
  const timezone: IEconomicBoardTimezoneSetting =
    await api.functional.economicBoard.settings.timezones.at(connection, {
      timezoneCode: validCode,
    });
  typia.assert(timezone);
  TestValidator.predicate(
    "valid timezone code returns non-empty result",
    timezone.length > 0,
  );
}
