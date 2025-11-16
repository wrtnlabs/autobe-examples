import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test error handling when attempting to delete a configuration setting with a
 * non-existent key.
 *
 * This test validates that the API properly returns an error response when
 * trying to delete a configuration setting that doesn't exist in the system. It
 * ensures the error handling distinguishes between authorization failures and
 * legitimate "not found" scenarios.
 */
export async function test_api_configuration_deletion_nonexistent_key(
  connection: api.IConnection,
) {
  // Create a new user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "securePassword123",
        password_hash: "securePassword123",
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: undefined,
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // Generate a random configuration key that doesn't exist in the system
  const nonExistentConfigurationKey = RandomGenerator.alphaNumeric(10);

  // Attempt to delete the non-existent configuration setting
  // This should return an error indicating the configuration key was not found
  await TestValidator.error(
    "deleting non-existent configuration key should fail",
    async () => {
      await api.functional.todoApp.user.configurations.erase(connection, {
        configurationKey: nonExistentConfigurationKey,
      });
    },
  );
}
