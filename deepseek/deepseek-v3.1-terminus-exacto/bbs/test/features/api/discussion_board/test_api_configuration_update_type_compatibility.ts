import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * This test validates configuration value and type compatibility during
 * updates. It verifies that when updating both config_value and config_type
 * simultaneously, the system properly validates that the new value is
 * compatible with the new type. The test covers successful type conversion
 * scenarios and ensures that invalid combinations are properly rejected. The
 * test follows the complete workflow: moderator authentication, initial
 * configuration creation, and then testing various type compatibility
 * scenarios.
 */
export async function test_api_configuration_update_type_compatibility(
  connection: api.IConnection,
) {
  // 1. Authenticate as moderator for configuration update privileges
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 8,
        }),
        password: "securePassword123",
        display_name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 2,
          wordMax: 6,
        }),
        bio: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 10,
        }),
        moderation_level: "admin",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create initial configuration to test update compatibility
  const initialConfig: IDiscussionBoardConfiguration =
    await api.functional.discussionBoard.moderator.configurations.create(
      connection,
      {
        body: {
          config_key: `test_config_${RandomGenerator.alphaNumeric(8)}`,
          config_value: "false", // boolean type initially
          config_type: "boolean",
          description: "Test configuration for type compatibility validation",
        } satisfies IDiscussionBoardConfiguration.ICreate,
      },
    );
  typia.assert(initialConfig);
  TestValidator.equals(
    "initial config value is false",
    initialConfig.config_value,
    "false",
  );
  TestValidator.equals(
    "initial config type is boolean",
    initialConfig.config_type,
    "boolean",
  );

  // 3. Test successful type conversion: boolean string to number
  const updatedConfig1: IDiscussionBoardConfiguration =
    await api.functional.discussionBoard.moderator.configurations.update(
      connection,
      {
        configKey: initialConfig.config_key,
        body: {
          config_value: "42", // Convert 42 to string
          config_type: "number", // Change type to number
        } satisfies IDiscussionBoardConfiguration.IUpdate,
      },
    );
  typia.assert(updatedConfig1);
  TestValidator.equals(
    "updated config value is 42",
    updatedConfig1.config_value,
    "42",
  );
  TestValidator.equals(
    "updated config type is number",
    updatedConfig1.config_type,
    "number",
  );

  // 4. Test successful type conversion: number to string
  const updatedConfig2: IDiscussionBoardConfiguration =
    await api.functional.discussionBoard.moderator.configurations.update(
      connection,
      {
        configKey: initialConfig.config_key,
        body: {
          config_value: "converted string value",
          config_type: "string", // Change type to string
        } satisfies IDiscussionBoardConfiguration.IUpdate,
      },
    );
  typia.assert(updatedConfig2);
  TestValidator.equals(
    "updated config value is string",
    updatedConfig2.config_value,
    "converted string value",
  );
  TestValidator.equals(
    "updated config type is string",
    updatedConfig2.config_type,
    "string",
  );

  // 5. Test successful type conversion: basic JSON
  const simpleJson = JSON.stringify({ enabled: true, count: 5 });
  const updatedConfig3: IDiscussionBoardConfiguration =
    await api.functional.discussionBoard.moderator.configurations.update(
      connection,
      {
        configKey: initialConfig.config_key,
        body: {
          config_value: simpleJson,
          config_type: "json", // Change type to json
        } satisfies IDiscussionBoardConfiguration.IUpdate,
      },
    );
  typia.assert(updatedConfig3);
  TestValidator.equals(
    "updated config value is json",
    updatedConfig3.config_value,
    simpleJson,
  );
  TestValidator.equals(
    "updated config type is json",
    updatedConfig3.config_type,
    "json",
  );

  // 6. Test error scenario: incompatible type conversion (string to boolean)
  await TestValidator.error(
    "incompatible string value with boolean type should be rejected",
    async () => {
      await api.functional.discussionBoard.moderator.configurations.update(
        connection,
        {
          configKey: initialConfig.config_key,
          body: {
            config_value: "not a boolean value", // Invalid for boolean type
            config_type: "boolean", // Trying to convert to boolean
          } satisfies IDiscussionBoardConfiguration.IUpdate,
        },
      );
    },
  );

  // 7. Test error scenario: incompatible type conversion (boolean to invalid json)
  await TestValidator.error(
    "incompatible boolean value with json type should be rejected",
    async () => {
      await api.functional.discussionBoard.moderator.configurations.update(
        connection,
        {
          configKey: initialConfig.config_key,
          body: {
            config_value: "true", // Valid boolean but invalid as JSON root
            config_type: "json", // JSON type expects object/array
          } satisfies IDiscussionBoardConfiguration.IUpdate,
        },
      );
    },
  );

  // 8. Test successful update with only value change (same type)
  const finalConfig: IDiscussionBoardConfiguration =
    await api.functional.discussionBoard.moderator.configurations.update(
      connection,
      {
        configKey: initialConfig.config_key,
        body: {
          config_value: JSON.stringify({ status: "active", users: 10 }), // Valid JSON
        } satisfies IDiscussionBoardConfiguration.IUpdate, // Keep json type
      },
    );
  typia.assert(finalConfig);
  TestValidator.equals(
    "final config value updated to valid json",
    finalConfig.config_value,
    JSON.stringify({ status: "active", users: 10 }),
  );
  TestValidator.equals(
    "final config type remains json",
    finalConfig.config_type,
    "json",
  );

  // 9. Verify the configuration management workflow
  TestValidator.predicate(
    "config key remains consistent throughout all updates",
    initialConfig.config_key === finalConfig.config_key,
  );
  TestValidator.predicate(
    "config id remains the same entity",
    initialConfig.id === finalConfig.id,
  );
  TestValidator.predicate(
    "configuration has been properly updated multiple times",
    initialConfig.config_value !== finalConfig.config_value &&
      initialConfig.config_type !== finalConfig.config_type,
  );
}
