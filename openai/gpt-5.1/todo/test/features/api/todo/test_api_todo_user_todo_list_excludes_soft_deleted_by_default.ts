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

export async function test_api_todo_user_todo_list_excludes_soft_deleted_by_default(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain admin auth context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.todo-app.local/join",
    referrer: "https://admin.todo-app.local/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates an ACTIVE default status for todos
  const todoStatusCreateBody = {
    code: "ACTIVE",
    label: "Active",
    description: "Active todo status used as default for new items",
    group: "core",
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const activeStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: todoStatusCreateBody,
    });
  typia.assert(activeStatus);
  TestValidator.equals(
    "created status code should be ACTIVE",
    activeStatus.code,
    todoStatusCreateBody.code,
  );
  TestValidator.predicate(
    "status should be default and active",
    activeStatus.is_default === true && activeStatus.is_active === true,
  );

  // 3. Todo user joins (self-registration) and is authenticated
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.local/join",
    referrer: "https://todo-app.local/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const todoUserAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert(todoUserAuthorized);

  // 4. Create multiple todos for this user
  const todoCount = 5;
  const createdTodos: ITodoAppTodo[] = [];

  for (let i = 0; i < todoCount; ++i) {
    const createTodoBody = {
      title: `Todo item ${i + 1}`,
      description: RandomGenerator.paragraph({ sentences: 4 }),
      due_date: new Date(
        Date.now() + 1000 * 60 * 60 * 24 * (i + 1),
      ).toISOString(),
      status_code: activeStatus.code,
    } satisfies ITodoAppTodo.ICreate;

    const todo: ITodoAppTodo =
      await api.functional.todoApp.todoUser.todos.create(connection, {
        body: createTodoBody,
      });
    typia.assert(todo);
    createdTodos.push(todo);
  }

  TestValidator.equals(
    "should have created expected number of todos",
    createdTodos.length,
    todoCount,
  );

  const createdTodoIds = createdTodos.map((t) => t.id);

  // 5. Soft-delete a subset of todos (e.g., first 2)
  const deletedTodos = createdTodos.slice(0, 2);
  const activeTodos = createdTodos.slice(2);

  for (const deleted of deletedTodos) {
    await api.functional.todoApp.todoUser.todos.erase(connection, {
      todoId: deleted.id,
    });
  }

  // 6. List todos without includeDeleted (default behavior)
  const listWithoutDeletedRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: (todoCount + 5) as number & tags.Type<"int32"> & tags.Minimum<1>,
    includeDeleted: undefined,
  } satisfies ITodoAppTodo.IRequest;

  const pageWithoutDeleted: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.todoUser.todos.index(connection, {
      body: listWithoutDeletedRequest,
    });
  typia.assert(pageWithoutDeleted);

  const paginationWithoutDeleted: IPage.IPagination =
    pageWithoutDeleted.pagination;
  typia.assert(paginationWithoutDeleted);

  const idsWithoutDeleted = pageWithoutDeleted.data.map((d) => d.id);

  // Assert that deleted todos are not present
  for (const deleted of deletedTodos) {
    TestValidator.predicate(
      "soft-deleted todo should be excluded by default listing",
      idsWithoutDeleted.includes(deleted.id) === false,
    );
  }

  // Assert that active todos remain visible
  for (const active of activeTodos) {
    TestValidator.predicate(
      "non-deleted todo should be visible in default listing",
      idsWithoutDeleted.includes(active.id) === true,
    );
  }

  // 7. List todos with includeDeleted: true
  const listWithDeletedRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: (todoCount + 5) as number & tags.Type<"int32"> & tags.Minimum<1>,
    includeDeleted: true,
  } satisfies ITodoAppTodo.IRequest;

  const pageWithDeleted: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.todoUser.todos.index(connection, {
      body: listWithDeletedRequest,
    });
  typia.assert(pageWithDeleted);
  typia.assert(pageWithDeleted.pagination);

  const idsWithDeleted = pageWithDeleted.data.map((d) => d.id);

  // All created TODO ids should be present when includeDeleted is true
  for (const id of createdTodoIds) {
    TestValidator.predicate(
      "all created todos should be visible when includeDeleted is true",
      idsWithDeleted.includes(id) === true,
    );
  }
}
