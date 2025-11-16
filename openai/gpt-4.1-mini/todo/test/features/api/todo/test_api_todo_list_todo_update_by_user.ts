import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";

export async function test_api_todo_list_todo_update_by_user(
  connection: api.IConnection,
) {
  // 1. Create a new user via POST /auth/user/join
  const userCreationInput = {
    email: RandomGenerator.alphaNumeric(8) + "@test.com",
    password: "TestPass123!",
    name: RandomGenerator.name(2),
  } satisfies ITodoListTodoListUser.ICreate;
  const authorizedUser: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreationInput,
    });
  typia.assert(authorizedUser);

  // 2. Prepare a new todo item creation input
  const todoCreateInput = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 12,
    }),
    status: "pending",
    due_date: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days in the future
  } satisfies ITodoListTodo.ICreate;

  // 3. Create the todo item
  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todoListTodos.create(connection, {
      body: todoCreateInput,
    });
  typia.assert(createdTodo);

  // 4. Prepare update input with mutation to mutable fields
  const todoUpdateInput: ITodoListTodo.IUpdate = {
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 3, wordMax: 8 }),
    description: null, // Explicitly setting to null
    status: "completed",
    due_date: new Date(Date.now() + 86400000 * 10).toISOString(), // 10 days in the future
  };

  // 5. Update the todo item
  const updatedTodo: ITodoListTodo =
    await api.functional.todoList.user.todoListTodos.update(connection, {
      id: createdTodo.id,
      body: todoUpdateInput,
    });
  typia.assert(updatedTodo);

  // 6. Validate updated fields reflect changes
  TestValidator.equals(
    "updated title should match",
    updatedTodo.title,
    todoUpdateInput.title,
  );
  TestValidator.equals(
    "updated description should be null",
    updatedTodo.description,
    null,
  );
  TestValidator.equals(
    "updated status should be 'completed'",
    updatedTodo.status,
    "completed",
  );
  TestValidator.equals(
    "updated due_date should match",
    updatedTodo.due_date,
    todoUpdateInput.due_date,
  );

  // 7. Try to update todo item without authentication (simulate unauthenticated connection)
  const unauthenticatedConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized update should fail", async () => {
    await api.functional.todoList.user.todoListTodos.update(
      unauthenticatedConnection,
      {
        id: createdTodo.id,
        body: {
          title: "Malicious update",
        } satisfies ITodoListTodo.IUpdate,
      },
    );
  });
}
