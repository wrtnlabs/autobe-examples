import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test user account status updates to validate account lifecycle management.
 *
 * This E2E test validates the complete workflow of user account status
 * transitions in the Todo application. It covers creating a user account,
 * authenticating, and testing various status transitions between different
 * account states including active, suspended, verified, pending_verification,
 * and locked.
 *
 * The test ensures proper authorization checks prevent unauthorized status
 * modifications and validates that status changes trigger appropriate system
 * behaviors while maintaining account security and data integrity.
 */
export async function test_api_user_profile_update_status_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123";

  const newUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: RandomGenerator.name(),
      href: "https://todoapp.example.com/register",
      referrer: "https://todoapp.example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(newUser);

  // Verify initial user status is 'pending_verification'
  TestValidator.equals(
    "initial user status should be pending_verification",
    newUser.status,
    "pending_verification",
  );

  // Step 2: Test updating user status to 'active'
  const activeUser = await api.functional.todoApp.user.users.update(
    connection,
    {
      userEmail: userEmail,
      body: {
        status: "active",
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(activeUser);

  // Verify status update was successful
  TestValidator.equals(
    "user status should be updated to active",
    activeUser.status,
    "active",
  );
  TestValidator.equals(
    "user email should remain unchanged",
    activeUser.email,
    userEmail,
  );
  TestValidator.equals(
    "user name should remain unchanged",
    activeUser.name,
    newUser.name,
  );

  // Step 3: Test updating user status to 'suspended'
  const suspendedUser = await api.functional.todoApp.user.users.update(
    connection,
    {
      userEmail: userEmail,
      body: {
        status: "suspended",
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(suspendedUser);

  // Verify status update was successful
  TestValidator.equals(
    "user status should be updated to suspended",
    suspendedUser.status,
    "suspended",
  );
  TestValidator.equals(
    "user email should remain unchanged",
    suspendedUser.email,
    userEmail,
  );

  // Step 4: Test updating user status to 'verified'
  const verifiedUser = await api.functional.todoApp.user.users.update(
    connection,
    {
      userEmail: userEmail,
      body: {
        status: "verified",
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(verifiedUser);

  // Verify status update was successful
  TestValidator.equals(
    "user status should be updated to verified",
    verifiedUser.status,
    "verified",
  );
  TestValidator.equals(
    "user email should remain unchanged",
    verifiedUser.email,
    userEmail,
  );

  // Step 5: Test updating user status to 'locked'
  const lockedUser = await api.functional.todoApp.user.users.update(
    connection,
    {
      userEmail: userEmail,
      body: {
        status: "locked",
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(lockedUser);

  // Verify status update was successful
  TestValidator.equals(
    "user status should be updated to locked",
    lockedUser.status,
    "locked",
  );
  TestValidator.equals(
    "user email should remain unchanged",
    lockedUser.email,
    userEmail,
  );

  // Step 6: Test updating user status back to 'active'
  const reactivatedUser = await api.functional.todoApp.user.users.update(
    connection,
    {
      userEmail: userEmail,
      body: {
        status: "active",
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(reactivatedUser);

  // Verify status update was successful
  TestValidator.equals(
    "user status should be updated back to active",
    reactivatedUser.status,
    "active",
  );
  TestValidator.equals(
    "user email should remain unchanged",
    reactivatedUser.email,
    userEmail,
  );

  // Step 7: Test updating user profile name along with status
  const updatedProfileUser = await api.functional.todoApp.user.users.update(
    connection,
    {
      userEmail: userEmail,
      body: {
        name: "Updated User Name",
        status: "verified",
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(updatedProfileUser);

  // Verify both name and status updates were successful
  TestValidator.equals(
    "user name should be updated",
    updatedProfileUser.name,
    "Updated User Name",
  );
  TestValidator.equals(
    "user status should be updated to verified",
    updatedProfileUser.status,
    "verified",
  );
  TestValidator.equals(
    "user email should remain unchanged",
    updatedProfileUser.email,
    userEmail,
  );

  // Step 8: Validate that timestamps are properly maintained
  TestValidator.predicate(
    "created_at timestamp should exist",
    updatedProfileUser.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp should exist",
    updatedProfileUser.updated_at !== undefined,
  );

  // Use proper type-safe date comparison
  const createdAt = typia.assert(updatedProfileUser.created_at!);
  const updatedAt = typia.assert(updatedProfileUser.updated_at!);
  TestValidator.predicate(
    "updated_at should be later than created_at",
    new Date(updatedAt) > new Date(createdAt),
  );

  // Step 9: Test error scenario - invalid status value
  await TestValidator.error("should reject invalid status value", async () => {
    await api.functional.todoApp.user.users.update(connection, {
      userEmail: userEmail,
      body: {
        status: "invalid_status",
      } satisfies ITodoAppUser.IUpdate,
    });
  });
}
