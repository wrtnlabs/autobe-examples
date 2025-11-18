import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListConfiguration";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test retrieval of specific user account information by user ID.
 *
 * This E2E test validates the complete workflow for retrieving user details:
 *
 * 1. Creates authenticated user context for authorization
 * 2. Sets up system configuration as prerequisite
 * 3. Creates target user account to be retrieved
 * 4. Retrieves user details using the generated user ID
 * 5. Validates all user fields are correctly returned
 * 6. Tests error handling for non-existent users
 */
export async function test_api_user_retrieval_by_id(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user context for authorization
  const authUserEmail = typia.random<string & tags.Format<"email">>();
  const authUser = await api.functional.auth.user.join(connection, {
    body: {
      email: authUserEmail,
      password: "testPassword123",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(authUser);

  // Step 2: Set up system configuration as prerequisite
  const configuration =
    await api.functional.todoList.user.configurations.create(connection, {
      body: {
        key: "test.configuration.key",
        value: "test-configuration-value",
        description: "Test configuration for user retrieval validation",
        category: "test",
      } satisfies ITodoListConfiguration.ICreate,
    });
  typia.assert(configuration);

  // Step 3: Create target user account to be retrieved
  const targetUserEmail = typia.random<string & tags.Format<"email">>();
  const targetUser = await api.functional.auth.user.join(connection, {
    body: {
      email: targetUserEmail,
      password: "targetUserPassword123",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(targetUser);

  // Step 4: Retrieve user details using the generated user ID
  const retrievedUser = await api.functional.todoList.user.users.at(
    connection,
    {
      userId: targetUser.id,
    },
  );
  typia.assert(retrievedUser);

  // Step 5: Validate all user fields are correctly returned
  TestValidator.equals("user ID matches", retrievedUser.id, targetUser.id);
  TestValidator.equals(
    "user email matches",
    retrievedUser.email,
    targetUserEmail,
  );
  TestValidator.equals("user status is active", retrievedUser.status, "active");
  TestValidator.predicate(
    "created_at timestamp is valid",
    retrievedUser.created_at !== null && retrievedUser.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp is valid",
    retrievedUser.updated_at !== null && retrievedUser.updated_at !== undefined,
  );
  TestValidator.predicate(
    "deleted_at is undefined for active user",
    retrievedUser.deleted_at === undefined,
  );

  // Validate sensitive authentication data is properly excluded
  TestValidator.predicate(
    "response does not contain password field",
    !("password" in retrievedUser),
  );
  TestValidator.predicate(
    "response does not contain token field",
    !("token" in retrievedUser),
  );

  // Step 6: Test error handling for non-existent user ID
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should throw error for non-existent user ID",
    async () => {
      await api.functional.todoList.user.users.at(connection, {
        userId: nonExistentUserId,
      });
    },
  );
}
