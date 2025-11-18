import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test permanent deletion of a user's own todo item and enforce
 * ownership/business rules
 *
 * This test verifies a complete workflow covering:
 *
 * 1. New user registration and authentication
 * 2. Todo creation as the owner
 * 3. Permanent deletion of the todo by the owner
 * 4. Deletion is immediate and irreversible
 * 5. Attempts to delete other's todo or non-existent todo are forbidden
 * 6. Unauthenticated users may not delete
 */
export async function test_api_todo_item_delete_user_owned(
  connection: api.IConnection,
) {
  // 1. Register a user (owner)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12) as string &
    tags.Format<"password">;
  const userReg = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      ip: null,
      href: "https://todolist.e2e-test.local/user/join",
      referrer: "https://todolist.e2e-test.local/",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(userReg);

  // 2. User creates a todo
  const todo = await api.functional.todoList.user.todos.create(connection, {
    body: {
      title: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 5,
        wordMax: 10,
      }) as string & tags.MinLength<1> & tags.MaxLength<255>,
      description: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 5,
        wordMax: 10,
      }),
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(todo);
  TestValidator.equals("todo owner id matches user", todo.user.id, userReg.id);

  // 3. User deletes his own todo
  await api.functional.todoList.user.todos.erase(connection, {
    todoId: todo.id,
  });

  // 4. Confirm todo is deleted: Try to re-delete (should fail)
  await TestValidator.error(
    "deleting already deleted todo should fail",
    async () => {
      await api.functional.todoList.user.todos.erase(connection, {
        todoId: todo.id,
      });
    },
  );

  // 5. Register another user (intruder)
  const intruderEmail = typia.random<string & tags.Format<"email">>();
  const intruderPassword = RandomGenerator.alphaNumeric(12) as string &
    tags.Format<"password">;
  const intruder = await api.functional.auth.user.join(connection, {
    body: {
      email: intruderEmail,
      password: intruderPassword,
      ip: null,
      href: "https://todolist.e2e-test.local/user/join",
      referrer: "https://todolist.e2e-test.local/",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(intruder);

  // 6. Intruder tries to delete owner's todo (should fail)
  await TestValidator.error("cannot delete another user's todo", async () => {
    await api.functional.todoList.user.todos.erase(connection, {
      todoId: todo.id,
    });
  });

  // 7. Intruder creates their own todo
  const intruderTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }) as string & tags.MinLength<1> & tags.MaxLength<255>,
        description: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(intruderTodo);

  // 8. Owner tries to delete intruder's todo (after re-auth as owner, should fail)
  await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      ip: null,
      href: "https://todolist.e2e-test.local/user/join",
      referrer: "https://todolist.e2e-test.local/",
    } satisfies ITodoListUser.ICreate,
  });
  await TestValidator.error("owner cannot delete other's todo", async () => {
    await api.functional.todoList.user.todos.erase(connection, {
      todoId: intruderTodo.id,
    });
  });

  // 9. Unauthenticated user tries to delete (simulate unauthenticated)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated delete must fail", async () => {
    await api.functional.todoList.user.todos.erase(unauthConn, {
      todoId: intruderTodo.id,
    });
  });

  // 10. Deleting non-existent todo (random UUID)
  const randomTodoId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent todo id should fail",
    async () => {
      await api.functional.todoList.user.todos.erase(connection, {
        todoId: randomTodoId,
      });
    },
  );
}
