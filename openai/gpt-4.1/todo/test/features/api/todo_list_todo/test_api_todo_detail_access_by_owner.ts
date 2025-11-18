import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSysMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSysMigration";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates that authenticated users can retrieve details of their own Todo by
 * id, and cannot access others'.
 *
 * 1. Register User A (join with valid email/password/href/referrer/ip [optional])
 * 2. Create a Todo for User A with a random description (1-250 chars, no duplicate
 *    [description, due date] pair)
 * 3. Retrieve that Todo by its id as User A; assert full ITodoListTodo response,
 *    all fields, ownership (user.id matches User A)
 * 4. Attempt to retrieve a random (non-existent) Todo id as User A; expect an
 *    error
 * 5. Register User B, then attempt to access User A's Todo id as User B; expect an
 *    error
 */
export async function test_api_todo_detail_access_by_owner(
  connection: api.IConnection,
) {
  // 1. Register User A
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAPassword = RandomGenerator.alphaNumeric(12);
  const userAJoinBody = {
    email: userAEmail,
    password: userAPassword,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoListUser.ICreate;
  const userAAuth = await api.functional.auth.user.join(connection, {
    body: userAJoinBody,
  });
  typia.assert(userAAuth);
  // 2. Create a Todo for User A
  const todoCreateBody = {
    description: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 15,
    }),
    due_date: null, // test with no due date to avoid duplicate edge case
  } satisfies ITodoListTodo.ICreate;
  const todo = await api.functional.todoList.user.todos.create(connection, {
    body: todoCreateBody,
  });
  typia.assert(todo);
  TestValidator.equals("Todo owner matches user A", todo.user.id, userAAuth.id);
  // 3. Retrieve Todo by id (as User A)
  const gotten = await api.functional.todoList.user.todos.at(connection, {
    todoId: todo.id,
  });
  typia.assert(gotten);
  TestValidator.equals("Todo ID matches", gotten.id, todo.id);
  TestValidator.equals(
    "Todo owner matches User A",
    gotten.user.id,
    userAAuth.id,
  );
  TestValidator.equals(
    "Todo content matches",
    gotten.description,
    todoCreateBody.description,
  );
  TestValidator.equals("Due date is null", gotten.due_date, null);
  // 4. Attempt to get a non-existent Todo as User A; expect error
  await TestValidator.error(
    "Getting non-existent Todo should fail",
    async () => {
      await api.functional.todoList.user.todos.at(connection, {
        todoId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
  // 5. Register User B
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBPassword = RandomGenerator.alphaNumeric(12);
  const userBJoinBody = {
    email: userBEmail,
    password: userBPassword,
    href: "https://example.com/join",
    referrer: "https://example.com/ads",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoListUser.ICreate;
  const userBAuth = await api.functional.auth.user.join(connection, {
    body: userBJoinBody,
  });
  typia.assert(userBAuth);
  // Try to get User A's Todo as User B (should fail)
  await TestValidator.error("Cannot access another user's Todo", async () => {
    await api.functional.todoList.user.todos.at(connection, {
      todoId: todo.id,
    });
  });
}
