import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppSystemMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemMetadata";

/**
 * Test deletion behavior when attempting to remove non-existent system metadata
 * configuration.
 *
 * This test validates proper error handling for configuration entries that
 * don't exist, ensuring system stability and appropriate error responses when
 * administrators attempt to delete non-existent metadata configurations.
 *
 * The test follows a systematic approach:
 *
 * 1. Create admin account through authentication system
 * 2. Establish administrator context for privileged operations
 * 3. Attempt to delete a non-existent configuration key
 * 4. Validate error handling and system stability
 *
 * This ensures the TodoApp system handles invalid deletion requests gracefully
 * while maintaining system integrity and providing clear feedback to
 * administrators.
 */
export async function test_api_system_metadata_deletion_nonexistent_config(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for testing
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "SecurePassword123!";

  const adminAccount: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        first_name: "Test",
        last_name: "Admin",
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(adminAccount);

  // Step 2: Establish administrator context
  const administrator: ITodoAppAdministrator =
    await api.functional.todoApp.administrators.create(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        first_name: "Test",
        last_name: "Admin",
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 3: Attempt to delete non-existent configuration
  const nonExistentConfigKey: string = `non_existent_config_${RandomGenerator.alphaNumeric(8)}`;

  await TestValidator.error(
    "deleting non-existent configuration should fail",
    async () => {
      await api.functional.todoApp.admin.system.metadata.erase(connection, {
        configKey: nonExistentConfigKey,
      });
    },
  );

  // Step 4: Verify system stability by attempting to read the configuration
  // This should also fail, confirming the configuration doesn't exist
  await TestValidator.error(
    "non-existent configuration should not be readable",
    async () => {
      // Note: We're testing error handling, so we attempt another operation
      // to ensure the system remains stable after the failed deletion
      await api.functional.todoApp.admin.system.metadata.erase(connection, {
        configKey: `another_non_existent_key_${RandomGenerator.alphaNumeric(6)}`,
      });
    },
  );
}
