import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";
import type { IEconomicBoardSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSystemConfig";

export async function test_api_system_config_key_malformed_input_rejection(
  connection: api.IConnection,
) {
  // Authenticate as moderator
  const moderator: IEconomicBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IEconomicBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Test malformed config keys that should be rejected
  const malformedKeys = [
    "config key with spaces", // Contains space
    "config/key/with/slashes", // Contains forward slashes
    "config\\key\\with\\backslashes", // Contains backslashes
    "config?query=param", // Contains query parameter syntax
    "config#fragment", // Contains fragment identifier
    "config{brackets}", // Contains curly braces
    "config[brackets]", // Contains square brackets
    'config"quoted"', // Contains quote marks
    "config,comma", // Contains comma
    "config;semicolon", // Contains semicolon
    "config|pipe", // Contains pipe
    "config^caret", // Contains caret
    "config&app", // Contains ampersand
    "config<less", // Contains less than
    "config>greater", // Contains greater than
    "config*asterisk", // Contains asterisk
    "config%percent", // Contains percent
    "config@at", // Contains at
    "config:colon", // Contains colon
    "config!exclaim", // Contains exclamation mark
    "config$ dollar", // Contains dollar sign
    "config( parenthesis ", // Contains parentheses
    "config) parenthesis ", // Contains parentheses
    "config" + String.fromCharCode(0) + "null", // Contains null byte
    "config" + String.fromCharCode(127) + "del", // Contains delete character
  ];

  // Test each malformed key
  for (const malformedKey of malformedKeys) {
    await TestValidator.error(
      `config key '${malformedKey}' should be rejected`,
      async () => {
        await api.functional.economicBoard.moderator.settings.config.at(
          connection,
          {
            configKey: malformedKey,
          },
        );
      },
    );
  }
}
