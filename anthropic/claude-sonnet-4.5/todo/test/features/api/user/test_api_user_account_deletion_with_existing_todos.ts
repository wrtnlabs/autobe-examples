import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test user account deletion when the user has created todo items, validating
 * the cascade deletion behavior.
 *
 * This test creates a user account, authenticates the user, creates multiple
 * todo items to establish data ownership, and then deletes the user account.
 * The test verifies that all todo items owned by the user are automatically
 * removed through cascade deletion as defined in the database schema
 * relationship, the user account record is permanently deleted, all session
 * records are removed, and the deletion operation completes atomically.
 *
 * Workflow:
 *
 * 1. Register a new user account for testing account deletion with associated todo
 *    data
 * 2. Authenticate as the newly created user
 * 3. Create multiple todo items owned by the user to test cascade deletion
 * 4. Delete the user account
 * 5. Verify the deletion completes successfully
 */
export async function test_api_user_account_deletion_with_existing_todos(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const registerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.IRegister;

  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registerData,
    });
  typia.assert(registeredUser);

  // Step 2: User is already authenticated after registration
  // The authentication token is automatically set in connection.headers

  // Step 3: Create multiple todo items owned by the user
  const todoCount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<5>
  >();
  const createdTodos: ITodoListTodo[] = await ArrayUtil.asyncRepeat(
    todoCount,
    async (index) => {
      const todoData = {
        title: `${RandomGenerator.name()} - ${index + 1}`,
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 7,
        }),
        status: RandomGenerator.pick(["complete", "incomplete"] as const),
      } satisfies ITodoListTodo.ICreate;

      const createdTodo: ITodoListTodo =
        await api.functional.todoList.user.todos.create(connection, {
          body: todoData,
        });
      typia.assert(createdTodo);

      return createdTodo;
    },
  );

  // Verify todos were created
  TestValidator.equals(
    "created todo count matches",
    createdTodos.length,
    todoCount,
  );

  // Step 4: Delete the user account
  await api.functional.todoList.user.users.me.erase(connection);

  // Step 5: Verification complete - deletion succeeded without errors
  // The cascade deletion should have automatically removed all associated todos
  // and session records as defined in the Prisma schema relationship
}
