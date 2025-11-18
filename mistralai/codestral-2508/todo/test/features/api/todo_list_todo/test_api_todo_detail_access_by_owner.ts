import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that an authenticated user can retrieve detailed information for
 * their own Todo by UUID.
 *
 * This test performs a comprehensive check of business logic, field
 * correctness, and access restrictions. The steps carried out by this test:
 *
 * 1. Register a new Todo List user and retrieve session (userA)
 * 2. Authenticate as userA (session is managed automatically by API)
 * 3. Create a new Todo for userA (title unique, description optional)
 * 4. Retrieve the created Todo by UUID as userA
 * 5. Verify all Todo fields (title, description, completed, audit timestamps,
 *    owner) against creation values
 * 6. Register a second user (userB), switching session to userB
 * 7. Attempt to fetch userA's Todo by UUID as userB
 * 8. Confirm that userB cannot access userA's Todo (forbidden or not found error)
 * 9. Optionally, try fetching with an invalid/random UUID as userA for not found
 *    check
 *
 * This scenario validates:
 *
 * - Proper field and audit value population
 * - Ownership and privacy of Todos
 * - No cross-user data leakage
 */
export async function test_api_todo_detail_access_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new user (userA)
  const userA_email = typia.random<string & tags.Format<"email">>();
  const userA_password = RandomGenerator.alphaNumeric(12);
  const userA_join = await api.functional.auth.user.join(connection, {
    body: {
      email: userA_email,
      password: userA_password as string & tags.Format<"password">,
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      display_name: RandomGenerator.name(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(userA_join);
  TestValidator.equals(
    "userA join profile email matches",
    userA_join.email,
    userA_email,
  );
  TestValidator.equals(
    "userA join profile display_name matches",
    userA_join.display_name,
    userA_join.display_name,
  );

  // 2. Create a Todo as userA
  const todo_title = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 10,
  });
  const todo_description = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 10,
  });
  const todoA = await api.functional.todoList.user.todos.create(connection, {
    body: {
      title: todo_title,
      description: todo_description,
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(todoA);
  TestValidator.equals("todo title matches", todoA.title, todo_title);
  TestValidator.equals(
    "todo description matches",
    todoA.description,
    todo_description,
  );
  TestValidator.equals("todo is not completed", todoA.completed, false);
  TestValidator.equals(
    "todo owner is userA",
    todoA.todo_list_user_id,
    userA_join.id,
  );

  // 3. Retrieve the Todo by UUID as userA
  const fetchedA = await api.functional.todoList.user.todos.at(connection, {
    todoId: todoA.id,
  });
  typia.assert(fetchedA);
  TestValidator.equals("fetchedA todo id matches", fetchedA.id, todoA.id);
  TestValidator.equals(
    "fetchedA todo title matches",
    fetchedA.title,
    todo_title,
  );
  TestValidator.equals(
    "fetchedA todo description matches",
    fetchedA.description,
    todo_description,
  );
  TestValidator.equals(
    "fetchedA todo completed matches",
    fetchedA.completed,
    false,
  );
  TestValidator.equals(
    "fetchedA owner matches",
    fetchedA.todo_list_user_id,
    userA_join.id,
  );
  TestValidator.equals(
    "created_at matches (not null)",
    typeof fetchedA.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at matches (not null)",
    typeof fetchedA.updated_at,
    "string",
  );

  // 4. Register a second user (userB)
  const userB_email = typia.random<string & tags.Format<"email">>();
  const userB_password = RandomGenerator.alphaNumeric(12);
  const userB_join = await api.functional.auth.user.join(connection, {
    body: {
      email: userB_email,
      password: userB_password as string & tags.Format<"password">,
      href: "https://example.com/signup-b",
      referrer: "https://example.com/landing",
      display_name: RandomGenerator.name(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(userB_join);
  TestValidator.equals(
    "userB join profile email matches",
    userB_join.email,
    userB_email,
  );

  // 5. Try to fetch userA's Todo by userB (should be forbidden or not found)
  await TestValidator.error("userB cannot access userA's Todo", async () => {
    await api.functional.todoList.user.todos.at(connection, {
      todoId: todoA.id,
    });
  });

  // 6. Try to fetch a random UUID as userB (not found)
  await TestValidator.error(
    "userB cannot access non-existent Todo",
    async () => {
      await api.functional.todoList.user.todos.at(connection, {
        todoId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 7. Switch back to userA and attempt to fetch random UUID (not found)
  await api.functional.auth.user.join(connection, {
    body: {
      email: userA_email,
      password: userA_password as string & tags.Format<"password">,
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      display_name: RandomGenerator.name(),
    } satisfies ITodoListUser.ICreate,
  });
  await TestValidator.error(
    "userA cannot access non-existent Todo",
    async () => {
      await api.functional.todoList.user.todos.at(connection, {
        todoId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
