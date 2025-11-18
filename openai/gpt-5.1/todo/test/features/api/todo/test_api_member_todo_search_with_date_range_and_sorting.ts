import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_member_todo_search_with_date_range_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register a new member user to obtain authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.example.com/join",
    referrer: "https://todo-app.example.com/landing",
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const authorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(authorized);

  // 2. Create at least three todos for this user with natural time gaps
  const createdTodos: ITodoAppTodo[] = [];
  for (let i = 0; i < 3; i++) {
    const todoBody = {
      title: `Todo ${i + 1} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
      description: RandomGenerator.paragraph({ sentences: 4 }),
    } satisfies ITodoAppTodo.ICreate;

    const todo: ITodoAppTodo =
      await api.functional.todoApp.memberUser.todos.create(connection, {
        body: todoBody,
      });
    typia.assert<ITodoAppTodo>(todo);
    createdTodos.push(todo);
  }

  // Ensure we have at least 3 todos
  TestValidator.predicate(
    "at least three todos created",
    createdTodos.length >= 3,
  );

  // Sort locally by created_at to build deterministic range boundaries
  const todosSortedAsc = [...createdTodos].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );

  const first = todosSortedAsc[0];
  const last = todosSortedAsc[todosSortedAsc.length - 1];

  // 3. Define date range [createdFrom, createdTo] to include all created todos.
  const createdFrom: string & tags.Format<"date-time"> = first.created_at;
  const createdTo: string & tags.Format<"date-time"> = last.created_at;

  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  // 4. Search with ascending order
  const ascRequestBody = {
    status: null,
    createdFrom,
    createdTo,
    completed: null,
    search: null,
    page,
    limit,
    orderBy: "createdAt",
    orderDirection: "asc",
  } satisfies ITodoAppTodo.IRequest;

  const ascPage: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.memberUser.todos.index(connection, {
      body: ascRequestBody,
    });
  typia.assert<IPageITodoAppTodo.ISummary>(ascPage);

  const ascData = ascPage.data;

  // 5. Verify that all returned todos fall within the date range
  await TestValidator.predicate("all asc todos within date range", async () => {
    return ascData.every((todo) => {
      return (
        todo.created_at.localeCompare(createdFrom) >= 0 &&
        todo.created_at.localeCompare(createdTo) <= 0
      );
    });
  });

  // 6. Verify ascending ordering by created_at
  await TestValidator.predicate(
    "todos ordered by created_at ascending",
    async () => {
      for (let i = 1; i < ascData.length; i++) {
        if (
          ascData[i - 1].created_at.localeCompare(ascData[i].created_at) > 0
        ) {
          return false;
        }
      }
      return true;
    },
  );

  // 7. Verify pagination current page and limit reflect the request
  TestValidator.equals(
    "pagination current page is 1",
    ascPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    ascPage.pagination.limit,
    limit,
  );

  // 8. Search with descending order for the same range
  const descRequestBody = {
    status: null,
    createdFrom,
    createdTo,
    completed: null,
    search: null,
    page,
    limit,
    orderBy: "createdAt",
    orderDirection: "desc",
  } satisfies ITodoAppTodo.IRequest;

  const descPage: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.memberUser.todos.index(connection, {
      body: descRequestBody,
    });
  typia.assert<IPageITodoAppTodo.ISummary>(descPage);

  const descData = descPage.data;

  // 9. Verify descending ordering by created_at
  await TestValidator.predicate(
    "todos ordered by created_at descending",
    async () => {
      for (let i = 1; i < descData.length; i++) {
        if (
          descData[i - 1].created_at.localeCompare(descData[i].created_at) < 0
        ) {
          return false;
        }
      }
      return true;
    },
  );

  // 10. Verify that the set of IDs is the same between asc and desc searches
  const ascIds = ascData.map((t) => t.id).sort();
  const descIds = descData.map((t) => t.id).sort();

  TestValidator.equals("asc and desc result IDs match", ascIds, descIds);
}
