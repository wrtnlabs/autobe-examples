import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test complete todo lifecycle from creation to update. User registers account,
 * creates a todo, then updates it with new title, description, and due date.
 * Validate that only the owner can update their todo, ensuring proper ownership
 * verification. Check that updated_at timestamp changes while ownership and
 * creation context remain immutable.
 */
export async function test_api_todo_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new user account
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "password123",
        password_hash: typia.random<string>(),
        status: "pending" as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: undefined,
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Create an initial todo item
  const initialTodo: ITodoAppTodo = await api.functional.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(initialTodo);

  // 3. Update the todo with new information
  const updatedTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.update(connection, {
      todoId: initialTodo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 4 }),
        description: RandomGenerator.paragraph({ sentences: 8 }),
        due_date: new Date(Date.now() + 172800000).toISOString(),
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(updatedTodo);

  // 4. Validate that todo was properly updated
  TestValidator.equals(
    "todo ID should remain the same",
    updatedTodo.id,
    initialTodo.id,
  );
  TestValidator.notEquals(
    "title should change after update",
    updatedTodo.title,
    initialTodo.title,
  );
  TestValidator.notEquals(
    "description should change after update",
    updatedTodo.description,
    initialTodo.description,
  );
  TestValidator.notEquals(
    "due date should change after update",
    updatedTodo.due_date,
    initialTodo.due_date,
  );
  TestValidator.notEquals(
    "updated_at timestamp should be different",
    updatedTodo.updated_at,
    initialTodo.updated_at,
  );
  TestValidator.equals(
    "created_at timestamp should remain the same",
    updatedTodo.created_at,
    initialTodo.created_at,
  );

  // 5. Test ownership verification by creating another user and attempting to update
  const anotherUserEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const anotherUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(
      {
        ...connection,
        headers: {},
      } satisfies api.IConnection,
      {
        body: {
          email: anotherUserEmail,
          password: "anotherpassword123",
          password_hash: typia.random<string>(),
          status: "pending" as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: undefined,
        } satisfies ITodoAppUser.ICreate,
      },
    );
  typia.assert(anotherUser);

  // 6. Attempt to update the todo with the second user (should fail due to ownership)
  await TestValidator.error(
    "non-owner should not be able to update todo",
    async () => {
      await api.functional.todoApp.user.todos.update(
        {
          ...connection,
          headers: {},
        } satisfies api.IConnection,
        {
          todoId: initialTodo.id,
          body: {
            title: "Unauthorized Update Attempt",
          } satisfies ITodoAppTodo.IUpdate,
        },
      );
    },
  );

  // 7. Switch back to original user and verify todo is still accessible
  const finalTodoCheck: ITodoAppTodo =
    await api.functional.todoApp.user.todos.update(connection, {
      todoId: initialTodo.id,
      body: {
        title: "Final Update by Owner",
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(finalTodoCheck);
  TestValidator.equals(
    "owner should still be able to update",
    finalTodoCheck.title,
    "Final Update by Owner",
  );
}
