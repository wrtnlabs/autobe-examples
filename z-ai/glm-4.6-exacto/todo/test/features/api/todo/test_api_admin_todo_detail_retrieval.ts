import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * E2E test verifying that an admin can retrieve the details of any user's todo
 * item.
 *
 * This test walks through the following steps:
 *
 * 1. Registers an admin and a normal user account to create independent
 *    authentication contexts.
 * 2. Logs in as the new user and creates a todo item with random title,
 *    description, and due_date.
 * 3. Logs in as the admin and fetches the created todo item by its unique id.
 * 4. Validates:
 *
 *    - The admin can access the todo details.
 *    - All business fields (title, status, due_date, description, audit fields) are
 *         present and valid.
 *    - The owner id matches the user who created the todo.
 *    - The status is "active", and permission boundary is respected (admin can get
 *         any todo).
 */
export async function test_api_admin_todo_detail_retrieval(
  connection: api.IConnection,
) {
  // Generate unique test data credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const userEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const userPassword = RandomGenerator.alphaNumeric(12);

  // 1. Register admin and user
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin-portal.example.com/register",
      referrer: "https://admin-portal.example.com/login",
    } satisfies ITodoAppAdmin.IJoin,
  });
  typia.assert(adminAuth);

  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://app.example.com/register",
      referrer: "https://app.example.com/login",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userAuth);

  // 2. Login as user and create todo
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoAppUser.ILogin,
  });

  const todoCreateInput = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // tomorrow
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: todoCreateInput,
    },
  );
  typia.assert(createdTodo);
  TestValidator.equals(
    "todo title matches input",
    createdTodo.title,
    todoCreateInput.title,
  );
  TestValidator.equals(
    "todo description matches input",
    createdTodo.description,
    todoCreateInput.description,
  );
  TestValidator.equals(
    "todo due_date matches input",
    createdTodo.due_date,
    todoCreateInput.due_date,
  );
  TestValidator.equals(
    "todo status is 'active' immediately after creation",
    createdTodo.status,
    "active",
  );

  // 3. Login as admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin-portal.example.com/login",
      referrer: "https://admin-portal.example.com/home",
    } satisfies ITodoAppAdmin.ILogin,
  });

  // 4. Admin fetches the todo details by todoId
  const fetchedTodo = await api.functional.todoApp.admin.todos.at(connection, {
    todoId: createdTodo.id,
  });
  typia.assert(fetchedTodo);
  TestValidator.equals(
    "fetched todo id matches created todo",
    fetchedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "fetched todo owner matches user who created it",
    fetchedTodo.todo_app_user_id,
    userAuth.id,
  );
  TestValidator.equals(
    "fetched todo title matches input",
    fetchedTodo.title,
    todoCreateInput.title,
  );
  TestValidator.equals(
    "fetched todo description matches input",
    fetchedTodo.description,
    todoCreateInput.description,
  );
  TestValidator.equals(
    "fetched todo due_date matches input",
    fetchedTodo.due_date,
    todoCreateInput.due_date,
  );
  TestValidator.equals(
    "fetched todo status is active",
    fetchedTodo.status,
    "active",
  );
  TestValidator.predicate(
    "admin has access to another user's todo",
    fetchedTodo.todo_app_user_id !== adminAuth.id,
  );
  // Audit fields validation
  TestValidator.predicate(
    "created_at must be ISO string",
    typeof fetchedTodo.created_at === "string" &&
      !isNaN(Date.parse(fetchedTodo.created_at)),
  );
  TestValidator.predicate(
    "updated_at must be ISO string",
    typeof fetchedTodo.updated_at === "string" &&
      !isNaN(Date.parse(fetchedTodo.updated_at)),
  );
  TestValidator.equals(
    "completed_at is null/undefined for active todo",
    fetchedTodo.completed_at,
    null,
  );
  TestValidator.equals(
    "deleted_at is null/undefined for active todo",
    fetchedTodo.deleted_at,
    null,
  );
}
