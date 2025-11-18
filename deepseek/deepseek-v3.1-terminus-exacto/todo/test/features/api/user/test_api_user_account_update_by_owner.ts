import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListConfiguration";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful user account update workflow where authenticated user updates
 * their own profile information.
 *
 * This test validates the complete workflow of user account management in the
 * todo list application:
 *
 * 1. User registration with authentication
 * 2. System configuration creation as prerequisite
 * 3. User profile update with email and status modifications
 * 4. Validation of updated profile data integrity
 *
 * The test ensures that authenticated users can modify their profile
 * information while maintaining system integrity and authentication
 * continuity.
 */
export async function test_api_user_account_update_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(registeredUser);

  // Step 2: Create prerequisite configuration
  const configuration =
    await api.functional.todoList.user.configurations.create(connection, {
      body: {
        key: `test.config.key.${typia.random<string & tags.Format<"uuid">>()}`,
        value: "test-config-value",
        description: "Test configuration for user account update workflow",
        category: "test",
      } satisfies ITodoListConfiguration.ICreate,
    });
  typia.assert(configuration);

  // Step 3: Update user account information
  const newEmail = typia.random<string & tags.Format<"email">>();
  const updatedUser = await api.functional.todoList.user.users.update(
    connection,
    {
      userId: registeredUser.id,
      body: {
        email: newEmail,
        status: "inactive" as const,
      } satisfies ITodoListUser.IUpdate,
    },
  );
  typia.assert(updatedUser);

  // Step 4: Validate update results
  TestValidator.equals(
    "user ID should remain unchanged after update",
    updatedUser.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "email should be updated to new value",
    updatedUser.email,
    newEmail,
  );
  TestValidator.equals(
    "status should be changed to inactive",
    updatedUser.status,
    "inactive",
  );
  TestValidator.notEquals(
    "updated_at timestamp should change after modification",
    updatedUser.updated_at,
    registeredUser.updated_at,
  );
  TestValidator.equals(
    "created_at timestamp should remain unchanged",
    updatedUser.created_at,
    registeredUser.created_at,
  );

  // Verify authentication tokens remain valid by attempting another operation
  const configuration2 =
    await api.functional.todoList.user.configurations.create(connection, {
      body: {
        key: `test.config.key2.${typia.random<string & tags.Format<"uuid">>()}`,
        value: "test-config-value2",
        description:
          "Second test configuration to verify authentication continuity",
        category: "test",
      } satisfies ITodoListConfiguration.ICreate,
    });
  typia.assert(configuration2);

  // Final validation that authentication remains intact
  TestValidator.predicate(
    "authentication should remain valid after profile update",
    configuration2 !== null,
  );
}
