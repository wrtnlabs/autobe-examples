import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodouser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodouser";

/**
 * Validate updating a todo item as its owner with full business and security
 * constraints.
 *
 * Steps:
 *
 * 1. Register todoUser A and create an initial todo as user A.
 * 2. Update the todo's title and description, verify outputs.
 * 3. Mark todo as completed (is_completed: true), verify completed_at gets set.
 * 4. Mark todo as incomplete (is_completed: false), verify completed_at becomes
 *    null/undefined.
 * 5. Try invalid update (blank title), confirm error is thrown.
 * 6. Register todoUser B, let them create a todo, then try to update B's todo as A
 *    (should error).
 */
export async function test_api_todo_update_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Register user A
  const userAJoin = await api.functional.auth.todoUser.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      href: "https://test-app/autobe/join",
      referrer: "https://test-app/landing",
      ip: null,
    } satisfies ITodoListTodouser.IVerifyJoin,
  });
  typia.assert(userAJoin);
  const userA = userAJoin;

  // Step 2: UserA creates a todo
  const origTitle = RandomGenerator.paragraph({ sentences: 3 });
  const origDesc = RandomGenerator.paragraph({ sentences: 6 });
  const todo = await api.functional.todoList.todoUser.todos.create(connection, {
    body: {
      title: origTitle,
      description: origDesc,
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(todo);
  TestValidator.equals(
    "todo owner matches userA",
    todo.todo_list_todouser_id,
    userA.id,
  );

  // Step 3: UserA updates todo's title and description
  const updateTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updateDesc = RandomGenerator.paragraph({ sentences: 10 });
  const updated1 = await api.functional.todoList.todoUser.todos.update(
    connection,
    {
      todoId: todo.id,
      body: {
        title: updateTitle,
        description: updateDesc,
      } satisfies ITodoListTodo.IUpdate,
    },
  );
  typia.assert(updated1);
  TestValidator.equals("title updated", updated1.title, updateTitle);
  TestValidator.equals("description updated", updated1.description, updateDesc);
  TestValidator.equals(
    "is_completed remains false",
    updated1.is_completed,
    false,
  );
  TestValidator.equals(
    "owner unchanged",
    updated1.todo_list_todouser_id,
    userA.id,
  );

  // Step 4: Mark todo as completed
  const completedAt = new Date().toISOString();
  const updated2 = await api.functional.todoList.todoUser.todos.update(
    connection,
    {
      todoId: todo.id,
      body: {
        is_completed: true,
        completed_at: completedAt,
      } satisfies ITodoListTodo.IUpdate,
    },
  );
  typia.assert(updated2);
  TestValidator.equals("todo marked completed", updated2.is_completed, true);
  TestValidator.equals(
    "completed_at set correctly",
    updated2.completed_at,
    completedAt,
  );

  // Step 5: Mark todo as incomplete (un-complete)
  const updated3 = await api.functional.todoList.todoUser.todos.update(
    connection,
    {
      todoId: todo.id,
      body: {
        is_completed: false,
        completed_at: null,
      } satisfies ITodoListTodo.IUpdate,
    },
  );
  typia.assert(updated3);
  TestValidator.equals("todo marked incomplete", updated3.is_completed, false);
  TestValidator.equals("completed_at cleared", updated3.completed_at, null);

  // Step 6: Try invalid update (blank title)
  await TestValidator.error("empty/blank title should fail", async () => {
    await api.functional.todoList.todoUser.todos.update(connection, {
      todoId: todo.id,
      body: {
        title: "", // invalid: blank title
      } satisfies ITodoListTodo.IUpdate,
    });
  });

  // Step 6b: Try invalid update (description too long)
  const tooLongDesc = "x".repeat(501);
  await TestValidator.error("description too long should fail", async () => {
    await api.functional.todoList.todoUser.todos.update(connection, {
      todoId: todo.id,
      body: {
        description: tooLongDesc,
      } satisfies ITodoListTodo.IUpdate,
    });
  });

  // Step 7: User B (different user) attempts to update todo A's todo
  const userB = await api.functional.auth.todoUser.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      href: "https://test-app/autobe/join",
      referrer: "https://test-app/landing",
      ip: null,
    } satisfies ITodoListTodouser.IVerifyJoin,
  });
  typia.assert(userB);

  // User B creates their own todo to confirm business logic
  const userBTodo = await api.functional.todoList.todoUser.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 4 }),
        description: RandomGenerator.paragraph({ sentences: 10 }),
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(userBTodo);
  TestValidator.equals(
    "todo owner matches userB",
    userBTodo.todo_list_todouser_id,
    userB.id,
  );

  // Try updating userB's todo as userA (should fail due to ownership)
  await TestValidator.error("cannot update other user's todo", async () => {
    await api.functional.todoList.todoUser.todos.update(connection, {
      todoId: userBTodo.id,
      body: {
        title: "hacked!",
        description: "exploit",
      } satisfies ITodoListTodo.IUpdate,
    });
  });
}
