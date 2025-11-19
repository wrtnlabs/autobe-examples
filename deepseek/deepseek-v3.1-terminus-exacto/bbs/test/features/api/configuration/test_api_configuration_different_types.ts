import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";

/**
 * Test retrieval of configuration settings across different data types.
 *
 * This test validates that the discussion board configuration system correctly
 * handles and returns configuration values for different data types including
 * boolean, number, string, and JSON formats. Each configuration type is tested
 * to ensure proper parsing, formatting, and type handling according to the
 * config_type field specification.
 */
export async function test_api_configuration_different_types(
  connection: api.IConnection,
) {
  // Generate realistic configuration keys for different types
  const configKeys = [
    "feature_toggle_boolean",
    "numeric_setting_limit",
    "text_configuration_message",
    "structured_data_json",
  ];

  // Test configurations with different data types
  for (const configKey of configKeys) {
    const config: IDiscussionBoardConfiguration =
      await api.functional.discussionBoard.configurations.at(connection, {
        configKey: configKey,
      });

    typia.assert(config);

    // Validate basic configuration structure
    TestValidator.predicate(
      "configuration should have valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        config.id,
      ),
    );
    TestValidator.equals(
      "configuration key should match requested key",
      config.config_key,
      configKey,
    );
    TestValidator.predicate(
      "configuration should have non-empty description",
      config.description.length > 0,
    );
    TestValidator.predicate(
      "configuration should have valid created_at timestamp",
      !isNaN(Date.parse(config.created_at)),
    );
    TestValidator.predicate(
      "configuration should have valid updated_at timestamp",
      !isNaN(Date.parse(config.updated_at)),
    );

    // Validate config_type and config_value based on type
    switch (config.config_type) {
      case "boolean":
        TestValidator.predicate(
          "boolean config value should be 'true' or 'false'",
          config.config_value === "true" || config.config_value === "false",
        );
        break;

      case "number":
        TestValidator.predicate(
          "numeric config value should be parsable as number",
          !isNaN(Number(config.config_value)),
        );
        break;

      case "string":
        TestValidator.predicate(
          "string config value should be non-empty",
          config.config_value.length > 0,
        );
        break;

      case "json":
        TestValidator.predicate(
          "JSON config value should be valid JSON",
          () => {
            try {
              const parsed = JSON.parse(config.config_value);
              return typeof parsed === "object" && parsed !== null;
            } catch {
              return false;
            }
          },
        );
        break;

      default:
        TestValidator.predicate(
          "config type should be one of supported types",
          ["boolean", "number", "string", "json"].includes(config.config_type),
        );
    }
  }
}
