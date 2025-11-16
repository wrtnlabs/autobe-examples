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

export async function test_api_todo_user_todo_list_filters_by_status_and_title(
  connection: api.IConnection,
) {
  // 1. Admin joins to configure statuses
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.todo-app.local/join",
    referrer: "https://admin.todo-app.local/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates two active statuses: ACTIVE and COMPLETED
  const activeStatusBody = {
    code: "ACTIVE",
    label: "Active",
    description: "Active todos",
    group: "core",
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const activeStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: activeStatusBody,
    });
  typia.assert(activeStatus);

  const completedStatusBody = {
    code: "COMPLETED",
    label: "Completed",
    description: "Completed todos",
    group: "core",
    sort_order: 2 as number & tags.Type<"int32">,
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const completedStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: completedStatusBody,
    });
  typia.assert(completedStatus);

  // 3. Todo user joins
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    display_name: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://todo-app.local/join",
    referrer: "https://todo-app.local/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const todoUserAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert(todoUserAuthorized);

  // 4. Seed todos as this user
  const keyword = "project";

  const buildTitleWithKeyword = (suffix: string): string =>
    `${RandomGenerator.paragraph({ sentences: 1 })} ${keyword} ${suffix}`;
  const buildTitleWithoutKeyword = (suffix: string): string =>
    `${RandomGenerator.paragraph({ sentences: 2 })} ${suffix}`;

  const todosWithKeywordAndActive: ITodoAppTodo[] = [];
  const todosCompletedOrNoKeyword: ITodoAppTodo[] = [];

  // Create 3 ACTIVE todos with keyword
  for (let i = 0; i < 3; i++) {
    const todoBody = {
      title: buildTitleWithKeyword(`#${i + 1}`),
      description: RandomGenerator.paragraph({ sentences: 3 }),
      due_date: null,
      status_code: "ACTIVE",
    } satisfies ITodoAppTodo.ICreate;

    const todo: ITodoAppTodo =
      await api.functional.todoApp.todoUser.todos.create(connection, {
        body: todoBody,
      });
    typia.assert(todo);
    todosWithKeywordAndActive.push(todo);
  }

  // Create 2 COMPLETED todos with keyword (should be excluded by status filter)
  for (let i = 0; i < 2; i++) {
    const todoBody = {
      title: buildTitleWithKeyword(`COMPLETED-${i + 1}`),
      description: RandomGenerator.paragraph({ sentences: 3 }),
      due_date: null,
      status_code: "COMPLETED",
    } satisfies ITodoAppTodo.ICreate;

    const todo: ITodoAppTodo =
      await api.functional.todoApp.todoUser.todos.create(connection, {
        body: todoBody,
      });
    typia.assert(todo);
    todosCompletedOrNoKeyword.push(todo);
  }

  // Create 2 ACTIVE todos without keyword (should be excluded by title filter)
  for (let i = 0; i < 2; i++) {
    const todoBody = {
      title: buildTitleWithoutKeyword(`NO-KW-${i + 1}`),
      description: RandomGenerator.paragraph({ sentences: 2 }),
      due_date: null,
      status_code: "ACTIVE",
    } satisfies ITodoAppTodo.ICreate;

    const todo: ITodoAppTodo =
      await api.functional.todoApp.todoUser.todos.create(connection, {
        body: todoBody,
      });
    typia.assert(todo);
    todosCompletedOrNoKeyword.push(todo);
  }

  const expectedMatchingIds = todosWithKeywordAndActive.map((t) => t.id);

  // 5. Call the index endpoint with statusCodes=["ACTIVE"] and titleKeyword
  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    statusCodes: ["ACTIVE"],
    titleKeyword: keyword,
  } satisfies ITodoAppTodo.IRequest;

  const page: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.todoUser.todos.index(connection, {
      body: requestBody,
    });
  typia.assert(page);

  const pagination = page.pagination;
  const summaries = page.data;

  // 6. Verify that every item matches both filters
  for (const summary of summaries) {
    TestValidator.equals(
      "status code should be ACTIVE",
      summary.status,
      "ACTIVE",
    );

    if (summary.statusInfo !== undefined) {
      TestValidator.equals(
        "statusInfo.code should be ACTIVE",
        summary.statusInfo.code,
        "ACTIVE",
      );
    }

    TestValidator.predicate(
      "title should contain keyword",
      summary.title.toLowerCase().includes(keyword.toLowerCase()),
    );
  }

  // 7. Verify that completed or non-keyword todos are not present
  const returnedIds = summaries.map((s) => s.id);

  for (const excluded of todosCompletedOrNoKeyword) {
    TestValidator.predicate(
      "non-matching todos should not be in the result",
      returnedIds.includes(excluded.id) === false,
    );
  }

  // 8. Validate pagination metadata
  const expectedCount = expectedMatchingIds.length;

  TestValidator.predicate(
    "pagination current page index should be non-negative",
    pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit should be positive and at least number of returned items",
    pagination.limit > 0 && pagination.limit >= summaries.length,
  );

  TestValidator.equals(
    "pagination.records should equal count of matching todos",
    pagination.records,
    expectedCount,
  );

  TestValidator.predicate(
    "pagination.pages should be zero when no records, otherwise at least one",
    expectedCount === 0 ? pagination.pages === 0 : pagination.pages >= 1,
  );

  TestValidator.predicate(
    "number of returned items should be <= requested limit",
    summaries.length <= requestBody.limit!,
  );
}
