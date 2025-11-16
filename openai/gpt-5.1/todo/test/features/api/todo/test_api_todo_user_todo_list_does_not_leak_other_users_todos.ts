import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminLogin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";
import type { ITodoAppTodoUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserLogin";

export async function test_api_todo_user_todo_list_does_not_leak_other_users_todos(
  connection: api.IConnection,
) {
  // 1. Admin joins and creates an ACTIVE status
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: "https://admin.todo-app.test/join",
    referrer: "https://admin.todo-app.test/",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(admin);

  // Create an ACTIVE status as admin
  const statusBody = {
    code: "ACTIVE",
    label: "Active",
    description: "Active todo status for normal tasks",
    group: "core",
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const status: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusBody,
    });
  typia.assert<ITodoAppTodoStatus>(status);

  // 2. Register todoUser A
  const userAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    display_name: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: "https://todo-app.test/join-a",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userA: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userAJoinBody,
    });
  typia.assert<ITodoAppTodoUser.IAuthorized>(userA);

  const userAPassword: string & tags.Format<"password"> =
    userAJoinBody.password;

  // 3. Create several todos for user A
  const userATodoCount = 5;
  const userATodoIds: (string & tags.Format<"uuid">)[] = [];
  for (let i = 0; i < userATodoCount; i++) {
    const todoBody = {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.content({ paragraphs: 1 }),
      due_date: RandomGenerator.date(
        new Date(),
        1000 * 60 * 60 * 24 * 7,
      ).toISOString(),
      status_code: status.code,
    } satisfies ITodoAppTodo.ICreate;

    const todo: ITodoAppTodo =
      await api.functional.todoApp.todoUser.todos.create(connection, {
        body: todoBody,
      });
    typia.assert<ITodoAppTodo>(todo);
    userATodoIds.push(todo.id);
  }

  // 4. Register todoUser B
  const userBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    display_name: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: "https://todo-app.test/join-b",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userB: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userBJoinBody,
    });
  typia.assert<ITodoAppTodoUser.IAuthorized>(userB);

  const userBPassword: string & tags.Format<"password"> =
    userBJoinBody.password;

  // 5. Create several todos for user B
  const userBTodoCount = 7;
  const userBTodoIds: (string & tags.Format<"uuid">)[] = [];
  for (let i = 0; i < userBTodoCount; i++) {
    const todoBody = {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.content({ paragraphs: 1 }),
      due_date: RandomGenerator.date(
        new Date(),
        1000 * 60 * 60 * 24 * 14,
      ).toISOString(),
      status_code: status.code,
    } satisfies ITodoAppTodo.ICreate;

    const todo: ITodoAppTodo =
      await api.functional.todoApp.todoUser.todos.create(connection, {
        body: todoBody,
      });
    typia.assert<ITodoAppTodo>(todo);
    userBTodoIds.push(todo.id);
  }

  // Helper to list todos for current authenticated user
  const listTodosForCurrentUser = async (
    page: number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: number & tags.Type<"int32"> & tags.Minimum<1>,
  ): Promise<IPageITodoAppTodo.ISummary> => {
    const body = {
      page,
      limit,
      includeDeleted: false,
    } satisfies ITodoAppTodo.IRequest;

    const pageResult: IPageITodoAppTodo.ISummary =
      await api.functional.todoApp.todoUser.todos.index(connection, {
        body,
      });
    typia.assert<IPageITodoAppTodo.ISummary>(pageResult);
    return pageResult;
  };

  // 6. List as user A and verify isolation and pagination
  const pageA = await listTodosForCurrentUser(
    1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    50 as number & tags.Type<"int32"> & tags.Minimum<1>,
  );

  // Verify that all returned todos belong to the set created by user A
  const pageATodoIds = pageA.data.map((todo) => todo.id);

  for (const id of pageATodoIds) {
    TestValidator.predicate(
      "user A listing contains only user A's todos",
      userATodoIds.includes(id as string & tags.Format<"uuid">),
    );
  }

  for (const id of userBTodoIds) {
    TestValidator.predicate(
      "user A listing does not contain user B's todos",
      pageATodoIds.includes(id) === false,
    );
  }

  // Pagination metadata checks for user A
  TestValidator.predicate(
    "pagination records for user A is at least the number of todos we created",
    pageA.pagination.records >= userATodoCount,
  );
  TestValidator.predicate(
    "pagination pages for user A is consistent",
    pageA.pagination.pages >= 1,
  );

  // 7. Switch to user B explicitly using login to ensure correct actor
  await api.functional.auth.todoUser.login(connection, {
    body: {
      email: userB.email,
      password: userBPassword,
      ip: RandomGenerator.mobile(),
      href: "https://todo-app.test/login-b",
      referrer: "https://todo-app.test/landing",
    } satisfies ITodoAppTodoUserLogin.IRequest,
  });

  // 8. List as user B and verify isolation and pagination
  const pageB = await listTodosForCurrentUser(
    1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    50 as number & tags.Type<"int32"> & tags.Minimum<1>,
  );

  const pageBTodoIds = pageB.data.map((todo) => todo.id);

  for (const id of pageBTodoIds) {
    TestValidator.predicate(
      "user B listing contains only user B's todos",
      userBTodoIds.includes(id as string & tags.Format<"uuid">),
    );
  }

  for (const id of userATodoIds) {
    TestValidator.predicate(
      "user B listing does not contain user A's todos",
      pageBTodoIds.includes(id) === false,
    );
  }

  // Pagination metadata checks for user B
  TestValidator.predicate(
    "pagination records for user B is at least the number of todos we created",
    pageB.pagination.records >= userBTodoCount,
  );
  TestValidator.predicate(
    "pagination pages for user B is consistent",
    pageB.pagination.pages >= 1,
  );
}
