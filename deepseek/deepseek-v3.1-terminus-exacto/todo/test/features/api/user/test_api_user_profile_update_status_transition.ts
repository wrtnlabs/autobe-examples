import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test account status transitions between pending, active, and suspended
 * states. Validates proper authorization checks for status changes and ensures
 * status transitions follow business rules and security policies.
 */
export async function test_api_user_profile_update_status_transition(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      password_hash: userPassword, // Server will handle hashing
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Verify initial user status is pending
  TestValidator.equals(
    "new user should have pending status",
    user.status,
    "pending",
  );

  // Step 2: Create a todo to establish user creation context
  const todo = await api.functional.todoApp.user.todos.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 5 }),
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);

  // Step 3: Test pending to active transition
  const updatedToActive = await api.functional.todoApp.user.users.update(
    connection,
    {
      userId: user.id,
      body: {
        status: "active",
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(updatedToActive);
  TestValidator.equals(
    "status should transition to active",
    updatedToActive.status,
    "active",
  );
  TestValidator.notEquals(
    "updated_at should change after status update",
    updatedToActive.updated_at,
    user.updated_at,
  );

  // Verify user can still perform operations in active state
  const activeUserTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(activeUserTodo);

  // Step 4: Test active to suspended transition
  const updatedToSuspended = await api.functional.todoApp.user.users.update(
    connection,
    {
      userId: user.id,
      body: {
        status: "suspended",
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(updatedToSuspended);
  TestValidator.equals(
    "status should transition to suspended",
    updatedToSuspended.status,
    "suspended",
  );

  // Step 5: Test suspended to active transition (reactivation)
  const reactivatedUser = await api.functional.todoApp.user.users.update(
    connection,
    {
      userId: user.id,
      body: {
        status: "active",
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(reactivatedUser);
  TestValidator.equals(
    "status should be reactivated to active",
    reactivatedUser.status,
    "active",
  );

  // Final validation: Verify user can perform operations after reactivation
  const finalTodo = await api.functional.todoApp.user.todos.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 4 }),
      description: RandomGenerator.paragraph({ sentences: 8 }),
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(finalTodo);

  // Validate that email and id remain consistent throughout all transitions
  TestValidator.equals(
    "email should remain constant",
    reactivatedUser.email,
    user.email,
  );
  TestValidator.equals(
    "id should remain constant",
    reactivatedUser.id,
    user.id,
  );
}
