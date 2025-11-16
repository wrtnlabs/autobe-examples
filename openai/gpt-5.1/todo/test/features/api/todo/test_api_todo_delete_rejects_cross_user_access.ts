import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminLogin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";
import type { ITodoAppTodoUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserLogin";

export async function test_api_todo_delete_rejects_cross_user_access(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain privileges for creating a Todo status
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates a concrete Todo status so todos can reference a valid status_code
  const statusCreateBody = {
    code: "ACTIVE",
    label: "Active",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "core",
    sort_order: 1 satisfies number & tags.Type<"int32">,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const status: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusCreateBody,
    });
  typia.assert(status);

  // 3. todoUser A joins (and becomes authenticated)
  const userAPassword = typia.random<string & tags.Format<"password">>();
  const userAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: userAPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userA: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userAJoinBody,
    });
  typia.assert(userA);

  // 4. As user A, create Todo A with the created status.code as status_code
  const todoCreateBodyA = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    due_date: typia.random<string & tags.Format<"date-time">>(),
    status_code: status.code,
  } satisfies ITodoAppTodo.ICreate;

  const todoA: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: todoCreateBodyA,
    });
  typia.assert(todoA);

  // 5. todoUser B joins (and becomes authenticated)
  const userBPassword = typia.random<string & tags.Format<"password">>();
  const userBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: userBPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userB: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userBJoinBody,
    });
  typia.assert(userB);

  // 6. As user B, attempt to delete Todo A - must fail with authorization/not-found error
  await TestValidator.error("cross-user todo delete must fail", async () => {
    await api.functional.todoApp.todoUser.todos.erase(connection, {
      todoId: todoA.id,
    });
  });

  // 7. Re-authenticate as user A via login
  const userALoginBody = {
    email: userA.email,
    password: userAPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoUserLogin.IRequest;

  const userALogin: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: userALoginBody,
    });
  typia.assert(userALogin);

  // 8. As user A (rightful owner), delete Todo A - should succeed without error
  await api.functional.todoApp.todoUser.todos.erase(connection, {
    todoId: todoA.id,
  });
}
