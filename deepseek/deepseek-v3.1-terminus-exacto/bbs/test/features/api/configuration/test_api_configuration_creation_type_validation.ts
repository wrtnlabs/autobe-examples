import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test configuration value type validation during creation. This scenario
 * verifies that the system correctly validates config_value against the
 * specified config_type, ensuring proper type compatibility. The test covers
 * all config_type options (boolean, number, string, json) with valid value
 * combinations and tests business logic validation errors.
 */
export async function test_api_configuration_creation_type_validation(
  connection: api.IConnection,
) {
  // 1. Authenticate as moderator for configuration creation privileges
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.paragraph({ sentences: 2 }),
      password: "password123",
      display_name: RandomGenerator.paragraph({ sentences: 1 }),
      bio: RandomGenerator.content({ paragraphs: 1 }),
      moderation_level: "admin",
      ip: "127.0.0.1",
      href: "https://example.com/dashboard",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Test valid configurations for each type
  const configTypes = ["boolean", "number", "string", "json"];

  for (const configType of configTypes) {
    const configKey = `test_${configType}_config_${RandomGenerator.alphaNumeric(8)}`;

    // Create valid configuration based on type
    let validConfigValue: string;
    switch (configType) {
      case "boolean":
        validConfigValue = "true";
        break;
      case "number":
        validConfigValue = "123.45";
        break;
      case "string":
        validConfigValue = "valid string value";
        break;
      case "json":
        validConfigValue = JSON.stringify({ key: "value", number: 42 });
        break;
      default:
        validConfigValue = "";
    }

    const validConfig =
      await api.functional.discussionBoard.moderator.configurations.create(
        connection,
        {
          body: {
            config_key: configKey,
            config_value: validConfigValue,
            config_type: configType,
            description: `Test ${configType} configuration`,
          } satisfies IDiscussionBoardConfiguration.ICreate,
        },
      );
    typia.assert(validConfig);
    TestValidator.equals(
      "config type matches",
      validConfig.config_type,
      configType,
    );
    TestValidator.equals(
      "config value matches",
      validConfig.config_value,
      validConfigValue,
    );
  }

  // Test specific business logic validation errors

  // Test invalid JSON format
  await TestValidator.error(
    "should reject malformed JSON for json type",
    async () => {
      await api.functional.discussionBoard.moderator.configurations.create(
        connection,
        {
          body: {
            config_key: `json_invalid_${RandomGenerator.alphaNumeric(6)}`,
            config_value: "{invalid: json, missing_quotes: true}",
            config_type: "json",
            description: "Invalid JSON format test",
          } satisfies IDiscussionBoardConfiguration.ICreate,
        },
      );
    },
  );

  // Test empty configuration key (if business logic prohibits it)
  await TestValidator.error("should reject empty config key", async () => {
    await api.functional.discussionBoard.moderator.configurations.create(
      connection,
      {
        body: {
          config_key: "",
          config_value: "test value",
          config_type: "string",
          description: "Empty key test",
        } satisfies IDiscussionBoardConfiguration.ICreate,
      },
    );
  });

  // Test duplicate configuration key
  const duplicateKey = `duplicate_test_${RandomGenerator.alphaNumeric(8)}`;

  // First create a valid configuration
  const firstConfig =
    await api.functional.discussionBoard.moderator.configurations.create(
      connection,
      {
        body: {
          config_key: duplicateKey,
          config_value: "first value",
          config_type: "string",
          description: "First configuration with duplicate key",
        } satisfies IDiscussionBoardConfiguration.ICreate,
      },
    );
  typia.assert(firstConfig);

  // Then attempt to create another with the same key
  await TestValidator.error("should reject duplicate config key", async () => {
    await api.functional.discussionBoard.moderator.configurations.create(
      connection,
      {
        body: {
          config_key: duplicateKey,
          config_value: "second value",
          config_type: "string",
          description: "Duplicate key test",
        } satisfies IDiscussionBoardConfiguration.ICreate,
      },
    );
  });
}
