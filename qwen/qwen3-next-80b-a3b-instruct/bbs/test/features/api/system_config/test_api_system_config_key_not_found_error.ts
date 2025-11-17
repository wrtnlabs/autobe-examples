import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";
import type { IEconomicBoardSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSystemConfig";

export async function test_api_system_config_key_not_found_error(
  connection: api.IConnection,
) {
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "123456",
    } satisfies IEconomicBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Use the established connection (with authenticated headers) to test non-existent config key
  await TestValidator.error(
    "non-existent config key should return 404",
    async () => {
      await api.functional.economicBoard.moderator.settings.config.at(
        connection,
        {
          configKey: "non_existing_setting",
        },
      );
    },
  );
}
