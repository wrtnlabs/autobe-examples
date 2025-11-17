import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";
import type { IEconomicBoardSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSystemConfig";

export async function test_api_system_config_retrieval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "securePassword123";

  // Authenticate as moderator
  const authenticatedModerator: IEconomicBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IEconomicBoardModerator.ICreate,
    });
  typia.assert(authenticatedModerator);

  // Retrieve system configuration
  const systemConfig: IEconomicBoardSystemConfig =
    await api.functional.economicBoard.moderator.settings.config.index(
      connection,
    );
  typia.assert(systemConfig);

  // Validate that the response is a valid string (as per IEconomicBoardSystemConfig schema)
  TestValidator.predicate(
    "config is a non-empty string",
    typeof systemConfig === "string" && systemConfig.length > 0,
  );
}
