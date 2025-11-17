import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";

export async function test_api_moderator_citizen_retrieve_nonexistent_id(
  connection: api.IConnection,
) {
  // Authenticate moderator
  const moderator: IEconomicBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IEconomicBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Attempt to retrieve non-existent citizen with a truly non-existent UUID
  await TestValidator.error(
    "moderator should be denied access to non-existent citizen",
    async () => {
      await api.functional.economicBoard.moderator.citizens.at(connection, {
        citizenId: typia.random<string & tags.Format<"uuid">>(), // Guaranteed non-existent UUID
      });
    },
  );
}
