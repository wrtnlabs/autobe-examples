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

export async function test_api_todo_update_rejects_cross_user_access(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a todoAdmin (administrator) account
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.todoapp.test/join",
    referrer: "https://admin.todoapp.test/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(adminAuthorized);

  // 2. As todoAdmin, create a valid Todo status for later use
  const statusBody = {
    code: "ACTIVE",
    label: "Active",
    description: "Active todo that is not yet completed",
    group: "core",
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const createdStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusBody,
    });
  typia.assert<ITodoAppTodoStatus>(createdStatus);

  // 3. Create and authenticate todoUser A via join
  const userAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const userAPassword = RandomGenerator.alphaNumeric(12) as string &
    tags.Format<"password">;

  const userAJoinBody = {
    email: userAEmail,
    password: userAPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todoapp.test/join",
    referrer: "https://todoapp.test/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userAAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userAJoinBody,
    });
  typia.assert<ITodoAppTodoUser.IAuthorized>(userAAuthorized);

  // 4. As user A, create a Todo using the created status code
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: new Date().toISOString() as string & tags.Format<"date-time">,
    status_code: createdStatus.code,
  } satisfies ITodoAppTodo.ICreate;

  const todoA: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert<ITodoAppTodo>(todoA);

  // 5. Create and authenticate todoUser B via join
  const userBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const userBPassword = RandomGenerator.alphaNumeric(12) as string &
    tags.Format<"password">;

  const userBJoinBody = {
    email: userBEmail,
    password: userBPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todoapp.test/join",
    referrer: "https://todoapp.test/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userBAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userBJoinBody,
    });
  typia.assert<ITodoAppTodoUser.IAuthorized>(userBAuthorized);

  // 6. As user B, attempt to update todoA (owned by user A) and expect failure
  const crossUserUpdateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    todo_status_id: createdStatus.id as string & tags.Format<"uuid">,
  } satisfies ITodoAppTodo.IUpdate;

  await TestValidator.error(
    "cross-user todo update should be rejected",
    async () => {
      await api.functional.todoApp.todoUser.todos.update(connection, {
        todoId: todoA.id,
        body: crossUserUpdateBody,
      });
    },
  );

  // 7. Re-authenticate as user A via login to restore user A context
  const userALoginBody = {
    email: userAEmail,
    password: userAPassword,
    ip: null,
    href: "https://todoapp.test/login",
    referrer: "https://todoapp.test/landing",
  } satisfies ITodoAppTodoUserLogin.IRequest;

  const userALoginAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: userALoginBody,
    });
  typia.assert<ITodoAppTodoUser.IAuthorized>(userALoginAuthorized);

  // 8. As user A, successfully update the Todo to verify ownership and data integrity
  const ownerUpdateBody = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ITodoAppTodo.IUpdate;

  const updatedTodoA: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.update(connection, {
      todoId: todoA.id,
      body: ownerUpdateBody,
    });
  typia.assert<ITodoAppTodo>(updatedTodoA);

  // Business assertions
  TestValidator.equals(
    "owner update should apply new title",
    updatedTodoA.title,
    ownerUpdateBody.title,
  );

  TestValidator.equals(
    "todo id should remain unchanged after updates",
    updatedTodoA.id,
    todoA.id,
  );
}
