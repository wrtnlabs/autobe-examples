import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validates that partial updates to user accounts preserve unchanged fields.
 *
 * This test verifies the partial update capability of the user account update
 * endpoint. When updating a user account with only specific fields in the
 * request body, all unspecified fields should retain their original values from
 * before the update.
 *
 * The test flow:
 *
 * 1. Register a new user account with email and status set to initial values
 * 2. Update the user account with only the email field in the request body
 * 3. Verify that the email has been updated to the new value
 * 4. Verify that the status field has been preserved (unchanged from initial
 *    value)
 * 5. Confirm that only the provided fields are modified while others remain intact
 *
 * This ensures that the partial update operation correctly implements
 * field-level update semantics where omitted fields are not cleared or reset,
 * preserving their existing state.
 */
export async function test_api_user_account_partial_update_preserves_fields(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account with initial email and status values
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const initialStatus: "active" | "inactive" = RandomGenerator.pick([
    "active",
    "inactive",
  ] as const);

  const registerResponse: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: initialEmail,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(registerResponse);

  // Verify the registered user has the correct initial values
  const userId = registerResponse.id;
  TestValidator.equals(
    "registered user email matches initial",
    registerResponse.email,
    initialEmail,
  );
  TestValidator.equals(
    "registered user has active status by default",
    registerResponse.status,
    "active",
  );

  // Step 2: Perform partial update - update only the email field
  const newEmail = typia.random<string & tags.Format<"email">>();

  const updateResponse: ITodoAppUser =
    await api.functional.todoApp.user.users.update(connection, {
      userId: userId,
      body: {
        email: newEmail,
        // Note: status is NOT provided in the request body - it should be preserved
      } satisfies ITodoAppUser.IUpdate,
    });
  typia.assert(updateResponse);

  // Step 3: Validate that the email has been updated
  TestValidator.equals(
    "email field was updated to new value",
    updateResponse.email,
    newEmail,
  );

  // Step 4: Validate that the status field has been preserved (unchanged)
  TestValidator.equals(
    "status field was preserved during partial update",
    updateResponse.status,
    registerResponse.status,
  );

  // Step 5: Verify that the updated user ID and timestamps make sense
  TestValidator.equals(
    "user ID remains unchanged after update",
    updateResponse.id,
    userId,
  );
  TestValidator.predicate("updated_at timestamp was updated", () => {
    const originalTime = new Date(registerResponse.updated_at).getTime();
    const updatedTime = new Date(updateResponse.updated_at).getTime();
    return updatedTime >= originalTime;
  });

  // Step 6: Verify the created_at timestamp is immutable
  TestValidator.equals(
    "created_at timestamp remains unchanged",
    updateResponse.created_at,
    registerResponse.created_at,
  );
}
