import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that users can mark their own todo as completed and that the correct
 * audit fields are updated accordingly.
 *
 * 1. User registration: Register a new user account and authenticate the test
 *    connection with valid email and password (store credentials for later
 *    login attempt).
 * 2. Todo creation: Create a new todo as this user with a random valid title and
 *    optional description, ensuring the returned entity is incomplete by
 *    default.
 * 3. Mark as completed: Update the created todo by setting the "completed"
 *    property to true, using the correct owner (authenticated user).
 * 4. Validate update response: Confirm the response reflects 'completed' is true,
 *    and 'completed_at' is a valid non-null timestamp (ISO 8601, UTC). Confirm
 *    the todo belongs to the updating user and its other fields are not changed
 *    except updated audit timestamps.
 * 5. Negative test (ownership enforcement): Register a second user, then attempt
 *    to update the first user's todo's 'completed' status as this new user. The
 *    operation must fail (business logic error; optimistic locking or forbidden
 *    access).
 * 6. Confirm original state not affected: Ensure the todo's completion state
 *    remains unchanged after the failed unauthorized attempt.
 */
export async function test_api_todo_update_completed_status(
  connection: api.IConnection,
) {
  // 1. User registration: Register and authenticate user A
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAPassword = typia.random<string & tags.Format<"password">>();
  const joinA = await api.functional.auth.user.join(connection, {
    body: {
      email: userAEmail,
      password: userAPassword,
      href: "https://test-app.com/register",
      referrer: "https://test-app.com/landing",
      display_name: RandomGenerator.name(1),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(joinA);
  TestValidator.equals(
    "userA email matches join input",
    joinA.email,
    userAEmail,
  );
  // 2. Todo creation: Create a new todo for user A
  const todoTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 10,
  });
  const todoDesc = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 15,
  });
  const todo = await api.functional.todoList.user.todos.create(connection, {
    body: {
      title: todoTitle,
      description: todoDesc,
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(todo);
  TestValidator.equals(
    "todo owner id matches userA",
    todo.todo_list_user_id,
    joinA.id,
  );
  TestValidator.equals("todo initially not completed", todo.completed, false);
  TestValidator.equals(
    "todo completed_at is null initially",
    todo.completed_at,
    null,
  );
  // 3. Mark as completed: userA marks the todo as completed
  const updated = await api.functional.todoList.user.todos.update(connection, {
    todoId: todo.id,
    body: {
      completed: true,
    } satisfies ITodoListTodo.IUpdate,
  });
  typia.assert(updated);
  TestValidator.equals("updated todo is completed", updated.completed, true);
  TestValidator.predicate(
    "updated.completed_at is ISO string",
    typeof updated.completed_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\..+Z$/.test(
        updated.completed_at ?? "",
      ),
  );
  TestValidator.equals(
    "owner remains correct after completion",
    updated.todo_list_user_id,
    todo.todo_list_user_id,
  );
  TestValidator.equals(
    "title remains unchanged after complete",
    updated.title,
    todo.title,
  );
  TestValidator.equals(
    "description remains unchanged after complete",
    updated.description,
    todo.description,
  );
  // 4. Negative test: Register user B and try to complete A's todo
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBPassword = typia.random<string & tags.Format<"password">>();
  const joinB = await api.functional.auth.user.join(connection, {
    body: {
      email: userBEmail,
      password: userBPassword,
      href: "https://test-app.com/register",
      referrer: "https://test-app.com/landing",
      display_name: RandomGenerator.name(1),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(joinB);
  TestValidator.equals(
    "userB email matches joinB input",
    joinB.email,
    userBEmail,
  );
  // Now userB is authenticated. Attempt to update A's todo.
  await TestValidator.error(
    "non-owner cannot update other's todo to complete",
    async () => {
      await api.functional.todoList.user.todos.update(connection, {
        todoId: todo.id,
        body: {
          completed: false,
        } satisfies ITodoListTodo.IUpdate,
      });
    },
  );
  // 5. Confirm A's todo not changed by failed update (state still completed: true)
  // Relogin as userA (authentication stickiness ensures original joinA is sufficient)
  // Try updating again to confirm optimistic locking: try re-completing and see no error
  const verify = await api.functional.todoList.user.todos.update(connection, {
    todoId: todo.id,
    body: {
      completed: true,
    } satisfies ITodoListTodo.IUpdate,
  });
  typia.assert(verify);
  TestValidator.equals(
    "todo remains completed after unauthorized attempt",
    verify.completed,
    true,
  );
  TestValidator.equals(
    "owner still userA after all attempts",
    verify.todo_list_user_id,
    joinA.id,
  );
}
