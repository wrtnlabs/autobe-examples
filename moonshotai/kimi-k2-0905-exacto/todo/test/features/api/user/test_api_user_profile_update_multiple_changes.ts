import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test multiple consecutive profile updates on the same user account.
 *
 * This test validates that the system handles multiple update requests
 * properly, maintains data consistency, and correctly updates timestamps with
 * each modification. Tests the robustness of the update mechanism under
 * repeated operations.
 *
 * Test flow:
 *
 * 1. Create a new user account through registration
 * 2. Perform multiple consecutive profile updates with different name values
 * 3. Verify that each update is applied correctly
 * 4. Validate that updated_at timestamps are updated with each modification
 * 5. Ensure data consistency across all updates
 */
export async function test_api_user_profile_update_multiple_changes(
  connection: api.IConnection,
) {
  // Create user account for testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const originalName = RandomGenerator.name();

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
      name: originalName,
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Store original timestamp for comparison
  const originalUpdatedAt = user.updated_at;

  // First update: Change name
  const firstUpdateName = RandomGenerator.name();
  const userAfterFirstUpdate = await api.functional.todoApp.user.users.update(
    connection,
    {
      userId: user.id,
      body: {
        name: firstUpdateName,
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(userAfterFirstUpdate);

  // Verify first update
  TestValidator.equals(
    "first update name applied",
    userAfterFirstUpdate.name,
    firstUpdateName,
  );
  TestValidator.notEquals(
    "updated_at changed after first update",
    userAfterFirstUpdate.updated_at,
    originalUpdatedAt,
  );

  // Second update: Change name again
  const secondUpdateName = RandomGenerator.name();
  const userAfterSecondUpdate = await api.functional.todoApp.user.users.update(
    connection,
    {
      userId: user.id,
      body: {
        name: secondUpdateName,
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(userAfterSecondUpdate);

  // Verify second update
  TestValidator.equals(
    "second update name applied",
    userAfterSecondUpdate.name,
    secondUpdateName,
  );
  TestValidator.notEquals(
    "updated_at changed after second update",
    userAfterSecondUpdate.updated_at,
    userAfterFirstUpdate.updated_at,
  );

  // Third update: Clear name (set to undefined)
  const userAfterThirdUpdate = await api.functional.todoApp.user.users.update(
    connection,
    {
      userId: user.id,
      body: {
        name: undefined,
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(userAfterThirdUpdate);

  // Verify third update
  TestValidator.equals(
    "third update name cleared",
    userAfterThirdUpdate.name,
    undefined,
  );
  TestValidator.notEquals(
    "updated_at changed after third update",
    userAfterThirdUpdate.updated_at,
    userAfterSecondUpdate.updated_at,
  );

  // Fourth update: Set name again
  const fourthUpdateName = RandomGenerator.name();
  const userAfterFourthUpdate = await api.functional.todoApp.user.users.update(
    connection,
    {
      userId: user.id,
      body: {
        name: fourthUpdateName,
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(userAfterFourthUpdate);

  // Verify fourth update
  TestValidator.equals(
    "fourth update name applied",
    userAfterFourthUpdate.name,
    fourthUpdateName,
  );
  TestValidator.notEquals(
    "updated_at changed after fourth update",
    userAfterFourthUpdate.updated_at,
    userAfterThirdUpdate.updated_at,
  );

  // Verify that user ID and email remain unchanged throughout all updates
  TestValidator.equals(
    "user ID preserved across updates",
    userAfterFourthUpdate.id,
    user.id,
  );
  TestValidator.equals(
    "user email preserved across updates",
    userAfterFourthUpdate.email,
    userEmail,
  );

  // Verify final state
  TestValidator.equals(
    "final name matches last update",
    userAfterFourthUpdate.name,
    fourthUpdateName,
  );
}
