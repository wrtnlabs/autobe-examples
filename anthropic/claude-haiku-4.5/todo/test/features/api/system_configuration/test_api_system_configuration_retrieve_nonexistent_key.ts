import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

/**
 * Test attempting to retrieve a system configuration with a config_key that
 * doesn't exist.
 *
 * This test validates that the API properly handles requests for non-existent
 * configuration entries by returning a 404 Not Found error. The system should
 * refuse to return data for configuration keys that have never been created or
 * have been deleted.
 *
 * Test workflow:
 *
 * 1. Attempt to retrieve a system configuration using a non-existent configuration
 *    key
 * 2. Validate that an HttpError with 404 status is thrown
 * 3. Confirm the API properly handles missing configuration lookups
 */
export async function test_api_system_configuration_retrieve_nonexistent_key(
  connection: api.IConnection,
) {
  await TestValidator.httpError(
    "should return 404 when retrieving nonexistent configuration key",
    404,
    async () => {
      await api.functional.todoList.systemConfigurations.at(connection, {
        configKey: "nonexistent_config_key_xyz",
      });
    },
  );
}
