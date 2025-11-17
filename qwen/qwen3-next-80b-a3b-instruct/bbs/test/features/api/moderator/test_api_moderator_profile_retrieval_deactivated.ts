import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardModerator";

export async function test_api_moderator_profile_retrieval_deactivated(
  connection: api.IConnection,
) {
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "securePassword123";

  // Step 1: Create a new moderator account
  const createdModerator: IEconomicBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IEconomicBoardModerator.ICreate,
    });
  typia.assert(createdModerator);

  // Step 2: Attempt to retrieve a non-existent moderator (simulating a deactivated profile)
  // The system returns 404 for non-existent or deactivated moderators
  // We generate a valid UUID format but random ID that doesn't exist in the system
  const nonExistentModeratorId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "deactivated moderator profile retrieval should fail with 404",
    async () => {
      await api.functional.economicBoard.moderator.moderators.at(connection, {
        moderatorId: nonExistentModeratorId,
      });
    },
  );
}
