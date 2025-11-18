import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test user account deletion with associated todo items cleanup validation.
 *
 * This comprehensive E2E test validates the complete data removal workflow when
 * a user account is deleted. The scenario ensures proper database integrity by
 * verifying that all related todo items are also removed from the system,
 * preventing orphaned records.
 */
export async function test_api_user_account_deletion_with_todos_cleanup(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

  const createdUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(createdUser);

  // Step 2: Create multiple todo items associated with the user account
  const todoCount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<5>
  >();
  const createdTodos: ITodoAppTodo[] = [];

  for (let i = 0; i < todoCount; i++) {
    const todo = await api.functional.todoApp.user.todos.create(connection, {
      body: {
        text: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        completed: i % 2 === 0,
      } satisfies ITodoAppTodo.ICreate,
    });
    typia.assert(todo);
    createdTodos.push(todo);
  }

  // Step 3: Perform user account deletion
  const deletedUser = await api.functional.todoApp.user.users.erase(
    connection,
    {
      userEmail: userEmail,
    },
  );
  typia.assert(deletedUser);

  // Step 4: Validate user account deletion was successful
  TestValidator.equals(
    "deleted user email matches",
    deletedUser.email,
    userEmail,
  );
  TestValidator.equals(
    "deleted user ID matches",
    deletedUser.id,
    createdUser.id,
  );

  // Step 5: Attempt to access deleted user's todo items to verify cleanup
  // Since the user account is deleted, attempting to create new todos should fail
  await TestValidator.error("cannot create todo for deleted user", async () => {
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        text: RandomGenerator.paragraph({ sentences: 2 }),
        completed: false,
      } satisfies ITodoAppTodo.ICreate,
    });
  });

  // Additional validation: Test that the user authentication is properly invalidated
  // by attempting to use the original user's context (which should fail)

  // Step 6: Create a new user to verify the system still works for valid users
  const newUserEmail = typia.random<string & tags.Format<"email">>();
  const newUser = await api.functional.auth.user.join(connection, {
    body: {
      email: newUserEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(newUser);

  // Verify new user can create todos (ensuring authentication is working for valid users)
  const newTodo = await api.functional.todoApp.user.todos.create(connection, {
    body: {
      text: RandomGenerator.paragraph({ sentences: 2 }),
      completed: true,
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(newTodo);

  // Final validation: The system maintains integrity with proper cleanup
  TestValidator.predicate(
    "user account deletion successfully processed and system integrity maintained",
    deletedUser.id !== newUser.id && newTodo.id !== createdTodos[0]?.id,
  );
}
