import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";
import type { IEconomicBoardSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSystemConfig";

export async function test_api_system_config_unauthorized_access_block(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator to establish a valid session
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IEconomicBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IEconomicBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create an unauthenticated connection by resetting headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 3: Attempt to access system config endpoint without authentication
  await TestValidator.error(
    "unauthorized access to system config should return 403 Forbidden",
    async () => {
      await api.functional.economicBoard.moderator.settings.config.index(
        unauthConn,
      );
    },
  );
}
