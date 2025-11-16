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

export async function test_api_todo_user_todo_list_respects_date_range_filters(
  connection: api.IConnection,
) {
  /** 1. Register an admin (todoAdmin) to configure a default ACTIVE status. */
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.todo-app.test/join",
    referrer: "https://admin.todo-app.test/",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  /**
   * 2. Admin creates a default ACTIVE todo status so user todos have a valid
   *    status.
   */
  const statusCreateBody = {
    code: "ACTIVE",
    label: "Active",
    description: "Default active status for todos",
    group: "core",
    sort_order: 1,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const status: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusCreateBody,
    });
  typia.assert(status);

  /** 3. TodoUser joins; SDK switches Authorization to this user. */
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.assert<string & tags.Format<"password">>(
    RandomGenerator.alphaNumeric(12),
  );

  const userJoinBody = {
    email: userEmail,
    password: userPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.test/join",
    referrer: "https://landing.todo-app.test/",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert(userAuthorized);

  /** 4. As todoUser, create several todos with different due_date values. */
  const nowBefore = new Date();

  const nearDueDate = new Date(nowBefore.getTime() + 2 * 24 * 60 * 60 * 1000);
  const farDueDate = new Date(nowBefore.getTime() + 30 * 24 * 60 * 60 * 1000);

  const todoBodies = [
    {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 6 }),
      due_date: nearDueDate.toISOString(),
      status_code: status.code,
    },
    {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 6 }),
      due_date: farDueDate.toISOString(),
      status_code: status.code,
    },
    {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 6 }),
      due_date: null,
      status_code: status.code,
    },
  ] satisfies ITodoAppTodo.ICreate[];

  const createdTodos: ITodoAppTodo[] = [];
  for (const body of todoBodies) {
    const created: ITodoAppTodo =
      await api.functional.todoApp.todoUser.todos.create(connection, {
        body,
      });
    typia.assert(created);
    createdTodos.push(created);
  }

  const nowAfter = new Date();

  /** Build createdAt filter range that should include all created todos. */
  const createdFrom = new Date(nowBefore.getTime() - 1_000).toISOString();
  const createdTo = new Date(nowAfter.getTime() + 1_000).toISOString();

  /** 5. Query with only createdAt range filters. */
  const createdRangeRequest = {
    createdFrom,
    createdTo,
    dueFrom: null,
    dueTo: null,
    includeDeleted: false,
    orderBy: "createdAt" as const,
    orderDirection: "asc" as const,
  } satisfies ITodoAppTodo.IRequest;

  const createdRangePage: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.todoUser.todos.index(connection, {
      body: createdRangeRequest,
    });
  typia.assert(createdRangePage);

  for (const summary of createdRangePage.data) {
    const createdAtDate = new Date(summary.created_at);
    TestValidator.predicate(
      "created_at is within createdFrom/createdTo range",
      createdAtDate.getTime() >= new Date(createdFrom).getTime() &&
        createdAtDate.getTime() <= new Date(createdTo).getTime(),
    );
  }

  /** 6. Query with only due_date range, targeting the nearDueDate todo. */
  const dueWindowFrom = new Date(
    nearDueDate.getTime() - 12 * 60 * 60 * 1000,
  ).toISOString();
  const dueWindowTo = new Date(
    nearDueDate.getTime() + 12 * 60 * 60 * 1000,
  ).toISOString();

  const dueRangeRequest = {
    createdFrom: null,
    createdTo: null,
    dueFrom: dueWindowFrom,
    dueTo: dueWindowTo,
    includeDeleted: false,
    orderBy: "dueDate" as const,
    orderDirection: "asc" as const,
  } satisfies ITodoAppTodo.IRequest;

  const dueRangePage: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.todoUser.todos.index(connection, {
      body: dueRangeRequest,
    });
  typia.assert(dueRangePage);

  for (const summary of dueRangePage.data) {
    TestValidator.predicate(
      "due_date is defined when filtering by due range",
      summary.due_date !== undefined && summary.due_date !== null,
    );

    if (summary.due_date !== undefined && summary.due_date !== null) {
      const dueDateValue = new Date(summary.due_date);
      TestValidator.predicate(
        "due_date is within dueFrom/dueTo range",
        dueDateValue.getTime() >= new Date(dueWindowFrom).getTime() &&
          dueDateValue.getTime() <= new Date(dueWindowTo).getTime(),
      );
    }
  }

  /** 7. Query with both createdAt and due_date ranges to produce a precise subset. */
  const combinedRequest = {
    createdFrom,
    createdTo,
    dueFrom: dueWindowFrom,
    dueTo: dueWindowTo,
    includeDeleted: false,
    orderBy: "createdAt" as const,
    orderDirection: "asc" as const,
  } satisfies ITodoAppTodo.IRequest;

  const combinedPage: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.todoUser.todos.index(connection, {
      body: combinedRequest,
    });
  typia.assert(combinedPage);

  // Compute expected subset using the locally created todos.
  const expectedCombined = createdTodos.filter((todo) => {
    const createdAtMs = new Date(todo.created_at).getTime();
    const inCreatedRange =
      createdAtMs >= new Date(createdFrom).getTime() &&
      createdAtMs <= new Date(createdTo).getTime();

    const dueRaw = todo.due_date ?? null;
    if (dueRaw === null) return false;

    const dueMs = new Date(dueRaw).getTime();
    const inDueRange =
      dueMs >= new Date(dueWindowFrom).getTime() &&
      dueMs <= new Date(dueWindowTo).getTime();

    return inCreatedRange && inDueRange;
  });

  TestValidator.equals(
    "pagination.records matches expected filtered todo count",
    combinedPage.pagination.records,
    expectedCombined.length,
  );
  TestValidator.equals(
    "data length matches expected filtered todo count",
    combinedPage.data.length,
    expectedCombined.length,
  );

  const expectedIds = expectedCombined.map((t) => t.id);
  for (const summary of combinedPage.data) {
    TestValidator.predicate(
      "combined filter result todo id is in expected subset",
      expectedIds.includes(summary.id),
    );
  }
}
