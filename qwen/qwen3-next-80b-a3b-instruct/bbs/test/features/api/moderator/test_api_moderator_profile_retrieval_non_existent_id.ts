import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";

export async function test_api_moderator_profile_retrieval_non_existent_id(
  connection: api.IConnection,
) {
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "securePassword123",
    } satisfies IEconomicBoardModerator.ICreate,
  });
  typia.assert(moderator);

  const nonExistentModeratorId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "non-existent moderator ID should return 404",
    async () => {
      await api.functional.economicBoard.moderator.moderators.at(connection, {
        moderatorId: nonExistentModeratorId,
      });
    },
  );
}
