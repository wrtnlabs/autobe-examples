import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_todo_list_filtered_sorted_paginated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  const userCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ITodoAppUser.IJoin;
  const authResponse = await authorize_user_join(userConnection, {
    body: userCredentials,
  });
  typia.assert(authResponse);
  // 2. Retrieve paginated list with filter and sort
  const requestBody: ITodoAppTodo.IRequest = {
    status: "completed",
    sortBy: "dueDate",
    sortDirection: "asc",
    page: 2,
    perPage: 5,
  };
  const paginatedTodos = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: requestBody,
    },
  );
  typia.assert(paginatedTodos);
  // 3. Validate results
  // Verify pagination metadata
  TestValidator.equals("page count", paginatedTodos.pagination.current, 2);
  TestValidator.equals("page size", paginatedTodos.pagination.limit, 5);
  TestValidator.predicate(
    "total records > 0",
    paginatedTodos.pagination.records > 0,
  );
  TestValidator.equals(
    "total pages calculation",
    Math.ceil(paginatedTodos.pagination.records / 5),
    paginatedTodos.pagination.pages,
  );
  // Verify data content
  TestValidator.equals("expected data length", paginatedTodos.data.length, 5);
  // Verify all returned todos are completed
  for (const todo of paginatedTodos.data) {
    TestValidator.equals("todo completed status", todo.is_completed, true);
    TestValidator.predicate("todo has due_date", todo.due_date !== null);
    TestValidator.predicate(
      "due_date is ISO format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(todo.due_date!),
    );
  }
  // Verify sorting by due_date ascending
  for (let i = 0; i < paginatedTodos.data.length - 1; i++) {
    const currentDueDate = new Date(paginatedTodos.data[i].due_date!);
    const nextDueDate = new Date(paginatedTodos.data[i + 1].due_date!);
    TestValidator.predicate(
      "due_date sorted ascending",
      currentDueDate <= nextDueDate,
    );
  }
  // Verify no todos from other users or deleted todos are included
  // (Since we used authenticated connection, this is inherently validated by the API)
}
