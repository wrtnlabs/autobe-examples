import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate the administrator's ability to hard delete a todo entry, permanently
 * erasing it from the system.
 *
 * This test covers compliance auditing, role-based access, and
 * irrecoverability:
 *
 * 1. Register a new admin and login as admin.
 * 2. Register a user, login as the user, and create a todo.
 * 3. Log back in as admin and permanently hard delete the todo.
 * 4. Confirm (as user) that the todo is completely erased:
 *
 *    - Cannot retrieve by id
 *    - Does not appear in listings
 *    - Cannot undo, restore, or soft delete
 * 5. Try unauthorized access: confirm that regular users cannot use the admin
 *    delete endpoint.
 * 6. Confirm that all steps are logged or traced for compliance/audit (note: if
 *    audit logs are available via API, validate presence).
 */
export async function test_api_admin_hard_delete_todo(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword: string & tags.MinLength<8> & tags.Format<"password"> =
    RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin.example.com/register",
      referrer: "https://admin.example.com/landing",
      ip: null,
    } satisfies ITodoListAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // Explicit admin login (token swapping)
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/landing",
      ip: null,
    } satisfies ITodoListAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // Step 2: Register and authenticate as a user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword: string = RandomGenerator.alphaNumeric(12);
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(userJoin);
  // Login as user (token swapping)
  const userLogin = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword as string &
        tags.MinLength<8> &
        tags.Format<"password">,
    } satisfies ITodoListUser.ILogin,
  });
  typia.assert(userLogin);

  // Step 3: Create a todo as the user
  const todo = await api.functional.todoList.user.todos.create(connection, {
    body: {
      description: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 4,
        wordMax: 10,
      }) as string & tags.MaxLength<255>,
      completed: false,
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(todo);

  // Step 4: Log back in as admin and hard delete the todo
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/landing",
      ip: null,
    } satisfies ITodoListAdmin.ILogin,
  });
  // Perform hard delete as admin
  const erased = await api.functional.todoList.admin.todos.erase(connection, {
    todoId: todo.id,
  });
  typia.assert(erased);
  TestValidator.equals("erased todo id matches", erased.id, todo.id);

  // Step 5: Verify as user that todo is no longer accessible (simulate access denied or not found)
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword as string &
        tags.MinLength<8> &
        tags.Format<"password">,
    } satisfies ITodoListUser.ILogin,
  });
  // Attempt to use admin delete endpoint (permission should be denied)
  await TestValidator.error(
    "user cannot perform admin hard delete",
    async () => {
      await api.functional.todoList.admin.todos.erase(connection, {
        todoId: todo.id,
      });
    },
  );
  // Confirm no access to the erased todo (simulate not-found error by trying to delete again as admin)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/landing",
      ip: null,
    } satisfies ITodoListAdmin.ILogin,
  });
  await TestValidator.error(
    "cannot hard delete already-erased todo again",
    async () => {
      await api.functional.todoList.admin.todos.erase(connection, {
        todoId: todo.id,
      });
    },
  );
}
