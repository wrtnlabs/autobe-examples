import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";

export async function test_api_citizen_profile_public_retrieval(
  connection: api.IConnection,
) {
  const citizenData = typia.random<IEconomicBoardCitizen>();
  const citizenCode = citizenData.id;

  const retrievedCitizen: IEconomicBoardCitizen =
    await api.functional.economicBoard.citizens.at(connection, {
      citizenCode,
    });
  typia.assert(retrievedCitizen);

  TestValidator.equals(
    "retrieved citizen data matches expected",
    retrievedCitizen,
    citizenData,
  );

  await TestValidator.error(
    "non-existent citizen code should return 404",
    async () => {
      await api.functional.economicBoard.citizens.at(connection, {
        citizenCode: "non-existent-citizen-code", // Invalid non-existent citizen code
      });
    },
  );
}
