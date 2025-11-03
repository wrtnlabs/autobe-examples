import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test user account status modification workflow.
 *
 * This test validates that user accounts can successfully modify their status
 * field between active and inactive states. The test verifies:
 *
 * 1. User registration creates an account with 'active' status
 * 2. Status can be changed from 'active' to 'inactive'
 * 3. Status can be changed back from 'inactive' to 'active'
 * 4. The updated_at timestamp changes with each modification
 * 5. Status changes are properly persisted and retrievable
 *
 * This ensures the status modification feature works correctly for account
 * management.
 */
export async function test_api_user_account_update_status_modification(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account with initial active status
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  const joinResponse: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(joinResponse);

  // Verify initial status is active
  TestValidator.equals(
    "initial user status should be active",
    joinResponse.status,
    "active",
  );
  const initialCreatedAt = joinResponse.created_at;
  const initialUpdatedAt = joinResponse.updated_at;

  // Step 2: Update user status from active to inactive
  const updateToInactiveResponse: ITodoAppUser =
    await api.functional.todoApp.user.users.update(connection, {
      userId: joinResponse.id,
      body: {
        status: "inactive",
      } satisfies ITodoAppUser.IUpdate,
    });
  typia.assert(updateToInactiveResponse);

  // Verify status changed to inactive
  TestValidator.equals(
    "status should be changed to inactive",
    updateToInactiveResponse.status,
    "inactive",
  );

  // Verify updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at should change after status modification",
    updateToInactiveResponse.updated_at,
    initialUpdatedAt,
  );

  // Verify created_at timestamp remained unchanged
  TestValidator.equals(
    "created_at should not change",
    updateToInactiveResponse.created_at,
    initialCreatedAt,
  );

  const inactiveUpdatedAt = updateToInactiveResponse.updated_at;

  // Step 3: Update user status from inactive back to active
  const updateToActiveResponse: ITodoAppUser =
    await api.functional.todoApp.user.users.update(connection, {
      userId: joinResponse.id,
      body: {
        status: "active",
      } satisfies ITodoAppUser.IUpdate,
    });
  typia.assert(updateToActiveResponse);

  // Verify status changed back to active
  TestValidator.equals(
    "status should be changed back to active",
    updateToActiveResponse.status,
    "active",
  );

  // Verify updated_at timestamp changed again
  TestValidator.notEquals(
    "updated_at should change again after second status modification",
    updateToActiveResponse.updated_at,
    inactiveUpdatedAt,
  );

  // Verify created_at timestamp still unchanged
  TestValidator.equals(
    "created_at should remain unchanged after all modifications",
    updateToActiveResponse.created_at,
    initialCreatedAt,
  );

  // Step 4: Verify status changes are properly persisted
  // Note: Since we don't have a GET endpoint to retrieve user by ID,
  // we verify the response from the update operation confirms persistence
  TestValidator.predicate(
    "user account reflects current active status",
    updateToActiveResponse.status === "active",
  );

  TestValidator.predicate(
    "timestamps are in valid date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      updateToActiveResponse.updated_at,
    ),
  );
}
