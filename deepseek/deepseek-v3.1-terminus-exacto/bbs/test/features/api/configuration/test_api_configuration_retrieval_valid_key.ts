import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";

/**
 * Test retrieval of specific configuration settings using valid configuration
 * keys.
 *
 * This test validates that the system correctly returns configuration values,
 * types, descriptions, and metadata for existing configuration keys. It
 * verifies that the response includes all required fields and that the data
 * types match the specified configuration types (boolean, number, string,
 * json). The operation should handle different configuration types
 * appropriately and return accurate timestamps for audit purposes.
 *
 * Since there's no API function to create configuration entries, this test
 * leverages the API's built-in random data generation capability to test
 * retrieval functionality by calling the configuration endpoint with randomly
 * generated configuration keys.
 */
export async function test_api_configuration_retrieval_valid_key(
  connection: api.IConnection,
) {
  // Generate a random configuration key to test retrieval
  const configKey = RandomGenerator.paragraph({ sentences: 3 })
    .replace(/\s+/g, "_")
    .toLowerCase();

  // Retrieve configuration using the randomly generated key
  const configuration: IDiscussionBoardConfiguration =
    await api.functional.discussionBoard.configurations.at(connection, {
      configKey: configKey,
    });

  // Validate the configuration response structure using typia
  typia.assert(configuration);

  // Verify configuration key matches the requested key
  TestValidator.equals(
    "retrieved configuration key matches requested key",
    configuration.config_key,
    configKey,
  );

  // Validate that config_type is one of the expected values using safe approach
  const validConfigTypes = ["boolean", "number", "string", "json"] as const;
  TestValidator.predicate(
    "configuration type is one of valid types",
    validConfigTypes.some(
      (validType) => configuration.config_type === validType,
    ),
  );

  // Validate that timestamps are properly formatted
  TestValidator.predicate(
    "created_at timestamp is properly formatted",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/.test(
      configuration.created_at,
    ),
  );

  TestValidator.predicate(
    "updated_at timestamp is properly formatted",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/.test(
      configuration.updated_at,
    ),
  );

  // Validate that config_value format matches the config_type specification
  switch (configuration.config_type) {
    case "boolean":
      TestValidator.predicate(
        "boolean configuration value is valid true/false string",
        configuration.config_value === "true" ||
          configuration.config_value === "false",
      );
      break;

    case "number":
      TestValidator.predicate(
        "numeric configuration value is valid number string",
        !isNaN(Number(configuration.config_value)) &&
          configuration.config_value.trim() !== "",
      );
      break;

    case "json":
      TestValidator.predicate(
        "JSON configuration value contains valid JSON syntax",
        () => {
          try {
            JSON.parse(configuration.config_value);
            return true;
          } catch {
            return false;
          }
        },
      );
      break;

    // No specific validation needed for "string" type beyond what typia.assert() already validates
  }
}
