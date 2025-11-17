import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";
import type { IEconomicBoardSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSystemConfig";

export async function test_api_system_config_key_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator by joining with random credentials
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IEconomicBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: RandomGenerator.alphabets(12),
      } satisfies IEconomicBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve a specific configuration setting by key using the established authentication context
  const configKey: string = "comment_max_length";
  const configValue: IEconomicBoardSystemConfig =
    await api.functional.economicBoard.moderator.settings.config.at(
      connection,
      {
        configKey,
      },
    );
  typia.assert(configValue);

  // Step 3: Validate that the retrieved configuration value is a valid serialized string based on the config key
  // For comment_max_length, the value should be a positive integer string
  TestValidator.predicate(
    "comment_max_length should be a positive integer string",
    /^[1-9]\d*$/.test(configValue),
  );
}
