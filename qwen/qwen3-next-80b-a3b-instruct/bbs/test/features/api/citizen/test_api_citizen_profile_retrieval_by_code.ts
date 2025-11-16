import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";

export async function test_api_citizen_profile_retrieval_by_code(
  connection: api.IConnection,
) {
  // Generate a valid citizen code for testing
  const citizenCode = RandomGenerator.alphaNumeric(12);

  // Test 1: Successful retrieval of existing citizen profile
  const citizen: IEconomicBoardCitizen =
    await api.functional.economic_board.citizens.at(connection, {
      citizenCode,
    });

  // Use typia.assert() to validate the complete structure and types
  typia.assert(citizen);

  // Test 2: Verify 404 response for non-existent citizen code
  // Generate a citizen code that doesn't exist
  const nonExistentCode = "nonexistent-code-" + RandomGenerator.alphaNumeric(8);
  await TestValidator.error(
    "non-existent citizen code should return 404",
    async () => {
      await api.functional.economic_board.citizens.at(connection, {
        citizenCode: nonExistentCode,
      });
    },
  );
}
