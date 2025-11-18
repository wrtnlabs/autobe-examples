import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that an authenticated user can update their own todo item by changing
 * title, description, due date, and completion status. Verify that only the
 * allowed fields are updatable, ownership is strictly enforced, audit fields
 * update as expected, and the response accurately reflects changes. Also assure
 * that completed_at system logic responds correctly to is_completed transitions
 * (setting or clearing completed_at).
 */
export async function test_api_todo_update_owned_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Register new user
  const joinReq = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(2),
    href: "https://testdomain.com/register",
    referrer: "https://testdomain.com/landing",
  } satisfies ITodoListUser.IJoin;
  const userAuth = await api.functional.auth.user.join(connection, {
    body: joinReq,
  });
  typia.assert(userAuth);
  TestValidator.equals("user email matches", userAuth.email, joinReq.email);

  // 2. Create a todo item
  const todoReq = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 6 }),
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 5,
      wordMax: 12,
    }),
    due_date: new Date(Date.now() + 86400000).toISOString(),
  } satisfies ITodoListTodo.ICreate;
  const created = await api.functional.todoList.user.todos.create(connection, {
    body: todoReq,
  });
  typia.assert(created);
  TestValidator.equals(
    "user is owner of todo",
    created.todo_list_user_id,
    userAuth.id,
  );
  TestValidator.equals("todo title equals input", created.title, todoReq.title);
  TestValidator.equals(
    "todo description equals input",
    created.description,
    todoReq.description,
  );
  TestValidator.equals(
    "todo due_date equals input",
    created.due_date,
    todoReq.due_date,
  );
  TestValidator.equals(
    "created todo is not completed initially",
    created.is_completed,
    false,
  );
  TestValidator.equals(
    "completed_at is initially null or undefined",
    created.completed_at,
    null,
  );

  // Save audit values for later
  const origCreatedAt = created.created_at;
  const origUpdatedAt = created.updated_at;
  const origOwnerId = created.todo_list_user_id;

  // 3.a. Update title, description, and due_date (none complete-related)
  const updateOne = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 2, wordMax: 6 }),
    description: null,
    due_date: new Date(Date.now() + 2 * 86400000).toISOString(),
  } satisfies ITodoListTodo.IUpdate;
  const updatedOne = await api.functional.todoList.user.todos.update(
    connection,
    { todoId: created.id, body: updateOne },
  );
  typia.assert(updatedOne);
  // Field values updated as expected
  TestValidator.equals(
    "title changed after update",
    updatedOne.title,
    updateOne.title,
  );
  TestValidator.equals(
    "description updated to null",
    updatedOne.description,
    null,
  );
  TestValidator.equals(
    "due_date changed after update",
    updatedOne.due_date,
    updateOne.due_date,
  );
  // System fields
  TestValidator.equals("todo id remains same", updatedOne.id, created.id);
  TestValidator.equals(
    "ownership is unchanged",
    updatedOne.todo_list_user_id,
    origOwnerId,
  );
  TestValidator.notEquals(
    "updated_at changed after update",
    updatedOne.updated_at,
    origUpdatedAt,
  );
  // State is still not completed
  TestValidator.equals(
    "is_completed remains false if not updated",
    updatedOne.is_completed,
    created.is_completed,
  );
  TestValidator.equals(
    "completed_at is still null",
    updatedOne.completed_at,
    null,
  );

  // 3.b. (Completion state) Update is_completed: true, expect completed_at now set
  const completeNow = {
    is_completed: true,
  } satisfies ITodoListTodo.IUpdate;
  const updatedComplete = await api.functional.todoList.user.todos.update(
    connection,
    { todoId: created.id, body: completeNow },
  );
  typia.assert(updatedComplete);
  TestValidator.equals(
    "is_completed now true",
    updatedComplete.is_completed,
    true,
  );
  TestValidator.predicate(
    "completed_at is set when completed",
    typeof updatedComplete.completed_at === "string" &&
      updatedComplete.completed_at.length > 0,
  );
  // Other basic field retention
  TestValidator.equals(
    "title remains the same when not updated",
    updatedComplete.title,
    updatedOne.title,
  );
  TestValidator.equals(
    "ownership still enforced after completion",
    updatedComplete.todo_list_user_id,
    origOwnerId,
  );
  TestValidator.notEquals(
    "updated_at updated again after status change",
    updatedComplete.updated_at,
    updatedOne.updated_at,
  );

  // 3.c. Reset to incomplete: is_completed: false, expect completed_at cleared
  const uncomplete = {
    is_completed: false,
  } satisfies ITodoListTodo.IUpdate;
  const updatedUnComplete = await api.functional.todoList.user.todos.update(
    connection,
    { todoId: created.id, body: uncomplete },
  );
  typia.assert(updatedUnComplete);
  TestValidator.equals(
    "is_completed now false",
    updatedUnComplete.is_completed,
    false,
  );
  TestValidator.equals(
    "completed_at cleared when uncompleted",
    updatedUnComplete.completed_at,
    null,
  );

  // 4. Attempt to tamper with uneditable field (should have no effect)
  // Ownership not patchable (not in DTO), but as final confirmation
  TestValidator.equals(
    "final owner id remains original",
    updatedUnComplete.todo_list_user_id,
    origOwnerId,
  );
  // System audit fields always system managed (created_at, id, todo_list_user_id should never change on update)
  TestValidator.equals(
    "system creation timestamp always stable",
    updatedUnComplete.created_at,
    origCreatedAt,
  );
}
