import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListConfiguration";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test comprehensive account status transitions including active to inactive,
 * inactive to active, and active to suspended states. Validates that status
 * changes are properly applied and that each status transition follows business
 * rules for user account management.
 */
export async function test_api_user_account_update_status_transitions(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user context through registration
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123!";

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(registeredUser);
  TestValidator.equals(
    "initial user status should be active",
    registeredUser.status,
    "active",
  );

  // Step 2: Create prerequisite configuration
  const configuration =
    await api.functional.todoList.user.configurations.create(connection, {
      body: {
        key: "user.status.transition.enabled",
        value: "true",
        description: "Enable user status transition functionality",
        category: "user_management",
      } satisfies ITodoListConfiguration.ICreate,
    });
  typia.assert(configuration);

  // Step 3: Test Active → Inactive transition
  const inactiveUpdate = await api.functional.todoList.user.users.update(
    connection,
    {
      userId: registeredUser.id,
      body: {
        status: "inactive",
      } satisfies ITodoListUser.IUpdate,
    },
  );
  typia.assert(inactiveUpdate);
  TestValidator.equals(
    "status should be inactive after transition",
    inactiveUpdate.status,
    "inactive",
  );

  // Step 4: Test Inactive → Active transition
  const activeUpdate = await api.functional.todoList.user.users.update(
    connection,
    {
      userId: registeredUser.id,
      body: {
        status: "active",
      } satisfies ITodoListUser.IUpdate,
    },
  );
  typia.assert(activeUpdate);
  TestValidator.equals(
    "status should be active after reactivation",
    activeUpdate.status,
    "active",
  );

  // Step 5: Test Active → Suspended transition
  const suspendedUpdate = await api.functional.todoList.user.users.update(
    connection,
    {
      userId: registeredUser.id,
      body: {
        status: "suspended",
      } satisfies ITodoListUser.IUpdate,
    },
  );
  typia.assert(suspendedUpdate);
  TestValidator.equals(
    "status should be suspended after suspension",
    suspendedUpdate.status,
    "suspended",
  );

  // Step 6: Final validation - verify all transitions were applied correctly
  TestValidator.equals(
    "user ID should remain consistent throughout transitions",
    suspendedUpdate.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "user email should remain unchanged",
    suspendedUpdate.email,
    registeredUser.email,
  );
}
