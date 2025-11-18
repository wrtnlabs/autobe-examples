import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that an admin can retrieve any user's todo by its id, regardless of
 * ownership.
 *
 * Steps:
 *
 * 1. Register a user with unique email/password.
 * 2. Log in as that user (handled by /auth/user/join) and create a todo item on
 *    the user's behalf.
 * 3. Register a new admin with unique admin email/password and required context
 *    (href, referrer).
 * 4. Log in as the admin (enabling role switch to admin) with matching
 *    credentials/context.
 * 5. Retrieve the todo by id using the admin-specific endpoint.
 * 6. Validate complete todo details, verifying privacy and audit field contract
 *    (but not violating the field whitelist).
 */
export async function test_api_todo_item_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(userJoin);

  // 2. Create todo as the registered user
  const todoDescription = RandomGenerator.paragraph({ sentences: 2 });
  const todoBody = {
    description: todoDescription,
    completed: false,
  } satisfies ITodoListTodo.ICreate;
  const createdTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: todoBody,
    },
  );
  typia.assert(createdTodo);

  // 3. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(14);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/login",
    } satisfies ITodoListAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 4. Authenticate as admin (role switch to admin)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/",
    } satisfies ITodoListAdmin.ILogin,
  });

  // 5. Retrieve the todo by id as admin
  const retrievedTodo = await api.functional.todoList.admin.todos.at(
    connection,
    {
      todoId: createdTodo.id,
    },
  );
  typia.assert(retrievedTodo);

  // 6. Validate that the admin sees a complete todo
  TestValidator.equals(
    "retrieved todo id matches created todo",
    retrievedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "retrieved todo description matches",
    retrievedTodo.description,
    todoBody.description,
  );
  TestValidator.equals(
    "retrieved todo completed status matches",
    retrievedTodo.completed,
    false,
  );
  TestValidator.equals(
    "todo created_at value present",
    typeof retrievedTodo.created_at,
    "string",
  );
  TestValidator.equals(
    "todo updated_at value present",
    typeof retrievedTodo.updated_at,
    "string",
  );
  TestValidator.equals(
    "todo completed_at value should be null or undefined",
    retrievedTodo.completed_at === null ||
      retrievedTodo.completed_at === undefined,
    true,
  );
  TestValidator.equals(
    "todo deleted_at value should be null or undefined",
    retrievedTodo.deleted_at === null || retrievedTodo.deleted_at === undefined,
    true,
  );
}
