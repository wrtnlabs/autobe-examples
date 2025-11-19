import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";

/**
 * Test configuration retrieval behavior when requesting non-existent or invalid
 * configuration keys.
 *
 * This test validates that the system returns appropriate error responses for
 * unknown configuration keys, including proper HTTP status codes and error
 * messages. It verifies that the operation handles malformed key formats
 * gracefully and provides clear error information to help users identify valid
 * configuration options.
 *
 * Test scenarios include:
 *
 * - Valid configuration key retrieval (baseline)
 * - Non-existent configuration keys
 * - Malformed key formats with special characters
 * - Empty keys and excessively long keys
 * - Edge cases to ensure robust error handling
 */
export async function test_api_configuration_retrieval_invalid_key(
  connection: api.IConnection,
) {
  // First, test with a valid-looking but non-existent configuration key
  // This establishes that the API properly rejects invalid keys
  await TestValidator.error(
    "non-existent configuration key should fail",
    async () => {
      await api.functional.discussionBoard.configurations.at(connection, {
        configKey: "non_existent_config_key_that_does_not_exist",
      });
    },
  );

  // Test empty configuration key
  await TestValidator.error("empty configuration key should fail", async () => {
    await api.functional.discussionBoard.configurations.at(connection, {
      configKey: "",
    });
  });

  // Test configuration key with special characters
  await TestValidator.error(
    "configuration key with special characters should fail",
    async () => {
      await api.functional.discussionBoard.configurations.at(connection, {
        configKey: "config@#$%^&*()_key",
      });
    },
  );

  // Test excessively long configuration key
  await TestValidator.error(
    "excessively long configuration key should fail",
    async () => {
      const longKey = RandomGenerator.alphabets(1000); // Generate 1000-character key
      await api.functional.discussionBoard.configurations.at(connection, {
        configKey: longKey,
      });
    },
  );

  // Test configuration key with spaces
  await TestValidator.error(
    "configuration key with spaces should fail",
    async () => {
      await api.functional.discussionBoard.configurations.at(connection, {
        configKey: "config key with spaces",
      });
    },
  );

  // Test numeric configuration key (as string)
  await TestValidator.error(
    "numeric configuration key should fail",
    async () => {
      await api.functional.discussionBoard.configurations.at(connection, {
        configKey: "12345",
      });
    },
  );

  // Test configuration key that resembles a valid format but doesn't exist
  await TestValidator.error(
    "configuration key resembling valid format but non-existent should fail",
    async () => {
      await api.functional.discussionBoard.configurations.at(connection, {
        configKey: "max_attachment_size_invalid",
      });
    },
  );

  // Test configuration key with only special characters
  await TestValidator.error(
    "configuration key with only special characters should fail",
    async () => {
      await api.functional.discussionBoard.configurations.at(connection, {
        configKey: "@#$%^&*()",
      });
    },
  );
}
