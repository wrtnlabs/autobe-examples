import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_system_configurations_create } from "../../../generate/generate_random_discussion_board_admin_system_configurations_create";
import { prepare_random_discussion_board_system_configuration } from "../../../prepare/prepare_random_discussion_board_system_configuration";

export async function test_api_system_configuration_create_sensitive_and_json(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create sensitive boolean configuration
  const sensitiveBooleanConfig =
    await generate_random_discussion_board_admin_system_configurations_create(
      adminConnection,
      {
        body: {
          config_key: `config.sensitive.${RandomGenerator.alphabets(8)}`,
          config_value: "true",
          data_type: "boolean",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          category: "security",
          is_sensitive: true,
        } satisfies IDiscussionBoardSystemConfiguration.ICreate,
      },
    );
  typia.assert(sensitiveBooleanConfig);
  // 3. Validate sensitive configuration
  TestValidator.equals(
    "sensitive configuration has data_type boolean",
    sensitiveBooleanConfig.data_type,
    "boolean",
  );
  TestValidator.equals(
    "sensitive configuration value matches",
    sensitiveBooleanConfig.config_value,
    "true",
  );
  TestValidator.predicate(
    "sensitive flag is true",
    sensitiveBooleanConfig.is_sensitive === true,
  );
  TestValidator.equals(
    "sensitive configuration category is security",
    sensitiveBooleanConfig.category,
    "security",
  );
  // 4. Create JSON configuration with complex data
  const jsonData = {
    nested: {
      values: [1, 2, 3, 4, 5],
      enabled: true,
      metadata: {
        created: new Date().toISOString(),
        version: "1.0.0",
      },
    },
    settings: {
      timeout: 30000,
      retries: 3,
      features: ["auth", "logging", "caching"],
    },
  };
  const jsonConfig =
    await generate_random_discussion_board_admin_system_configurations_create(
      adminConnection,
      {
        body: {
          config_key: `config.json.${RandomGenerator.alphabets(8)}`,
          config_value: JSON.stringify(jsonData),
          data_type: "json",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          category: "application",
          is_sensitive: false,
        } satisfies IDiscussionBoardSystemConfiguration.ICreate,
      },
    );
  typia.assert(jsonConfig);
  // 5. Validate JSON configuration
  TestValidator.equals(
    "json configuration has data_type json",
    jsonConfig.data_type,
    "json",
  );
  TestValidator.predicate("json configuration value is valid JSON", () => {
    try {
      JSON.parse(jsonConfig.config_value);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.predicate(
    "json configuration is not sensitive",
    jsonConfig.is_sensitive === false,
  );
  TestValidator.equals(
    "json configuration category is application",
    jsonConfig.category,
    "application",
  );
  // 6. Validate parsed JSON structure matches original
  const parsedJson = JSON.parse(jsonConfig.config_value);
  TestValidator.equals(
    "parsed JSON has same structure",
    parsedJson.nested.values.length,
    jsonData.nested.values.length,
  );
  TestValidator.equals(
    "parsed JSON has correct nested.enabled",
    parsedJson.nested.enabled,
    jsonData.nested.enabled,
  );
  TestValidator.predicate(
    "parsed JSON has settings.timeout",
    typeof parsedJson.settings.timeout === "number",
  );
  TestValidator.equals(
    "parsed JSON has correct features",
    parsedJson.settings.features.length,
    jsonData.settings.features.length,
  );
}
