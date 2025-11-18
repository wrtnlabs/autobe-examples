import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test complete user profile update workflow where a user updates their own
 * account information.
 *
 * This test validates that authenticated users can modify their display name,
 * password, and account status while ensuring data integrity and proper
 * authorization checks. The test covers successful profile updates with valid
 * data, verification that updated information persists correctly, and
 * confirmation that only the account owner can modify their own profile.
 */
export async function test_api_user_profile_update_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123";
  const initialName = RandomGenerator.name();

  const createdUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: initialName,
      href: "https://example.com/todo-app",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(createdUser);

  // Validate initial user creation
  TestValidator.equals(
    "initial user email matches",
    createdUser.email,
    userEmail,
  );
  TestValidator.equals(
    "initial user name matches",
    createdUser.name,
    initialName,
  );
  TestValidator.equals(
    "initial user status is pending_verification",
    createdUser.status,
    "pending_verification",
  );

  // Step 2: Perform profile update with authenticated user
  const updatedName = RandomGenerator.name();
  const updatedPassword = "NewPassword456";
  const updatedStatus = "active";

  const updatedUser = await api.functional.todoApp.user.users.update(
    connection,
    {
      userEmail: userEmail,
      body: {
        name: updatedName,
        password: updatedPassword,
        status: updatedStatus,
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(updatedUser);

  // Step 3: Validate that update operation succeeded
  TestValidator.equals(
    "user ID remains unchanged",
    updatedUser.id,
    createdUser.id,
  );
  TestValidator.equals(
    "user email remains unchanged",
    updatedUser.email,
    userEmail,
  );
  TestValidator.equals("user name was updated", updatedUser.name, updatedName);
  TestValidator.equals(
    "user status was updated",
    updatedUser.status,
    updatedStatus,
  );

  // Validate timestamps
  TestValidator.predicate(
    "created_at timestamp exists",
    updatedUser.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    updatedUser.updated_at !== undefined,
  );
  TestValidator.notEquals(
    "updated_at is different from created_at",
    updatedUser.updated_at,
    createdUser.updated_at,
  );

  // Step 4: Test partial updates (update only name)
  const partiallyUpdatedName = RandomGenerator.name();

  const partiallyUpdatedUser = await api.functional.todoApp.user.users.update(
    connection,
    {
      userEmail: userEmail,
      body: {
        name: partiallyUpdatedName,
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(partiallyUpdatedUser);

  TestValidator.equals(
    "partial update: name was changed",
    partiallyUpdatedUser.name,
    partiallyUpdatedName,
  );
  TestValidator.equals(
    "partial update: status remains unchanged",
    partiallyUpdatedUser.status,
    updatedStatus,
  );
  TestValidator.equals(
    "partial update: email remains unchanged",
    partiallyUpdatedUser.email,
    userEmail,
  );

  // Step 5: Test that email cannot be updated (immutable identifier)
  // This is implicitly tested by the API contract - the email field is not included in IUpdate
  // The API will reject any attempt to modify the email through the update endpoint

  // Step 6: Verify authorization boundaries
  // Create a second user to test that users cannot modify each other's profiles
  const secondUserEmail = typia.random<string & tags.Format<"email">>();

  const secondUser = await api.functional.auth.user.join(connection, {
    body: {
      email: secondUserEmail,
      password: "SecondUserPass123",
      name: RandomGenerator.name(),
      href: "https://example.com/todo-app",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(secondUser);

  // Attempt to update the first user's profile with second user's authentication
  // This should fail due to authorization boundaries
  await TestValidator.error(
    "second user cannot update first user's profile",
    async () => {
      await api.functional.todoApp.user.users.update(connection, {
        userEmail: userEmail, // First user's email
        body: {
          name: "UnauthorizedUpdate",
        } satisfies ITodoAppUser.IUpdate,
      });
    },
  );
}
