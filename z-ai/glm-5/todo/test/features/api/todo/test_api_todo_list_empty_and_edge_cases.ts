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

export async function test_api_todo_list_empty_and_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new user with no todos for testing empty results
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {});
  typia.assert(authorized);
  // 2. Test empty todo list with default parameters
  const emptyResult = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {} satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(emptyResult);
  // Verify empty array returned
  TestValidator.equals("empty data array", emptyResult.data, []);
  // Verify pagination metadata shows zero records and zero pages
  TestValidator.equals(
    "pagination current page",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", emptyResult.pagination.limit, 20);
  TestValidator.equals("pagination records", emptyResult.pagination.records, 0);
  TestValidator.equals("pagination pages", emptyResult.pagination.pages, 0);
  // 3. Test with explicit filter='all' - should still return empty
  const allFilterResult = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: { filter: "all" } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(allFilterResult);
  TestValidator.equals("filter all empty data", allFilterResult.data, []);
  TestValidator.equals(
    "filter all records",
    allFilterResult.pagination.records,
    0,
  );
  // 4. Test with filter='complete' - should return empty
  const completeFilterResult = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: { filter: "complete" } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(completeFilterResult);
  TestValidator.equals(
    "filter complete empty data",
    completeFilterResult.data,
    [],
  );
  TestValidator.equals(
    "filter complete records",
    completeFilterResult.pagination.records,
    0,
  );
  // 5. Test with filter='incomplete' - should return empty
  const incompleteFilterResult = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: { filter: "incomplete" } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(incompleteFilterResult);
  TestValidator.equals(
    "filter incomplete empty data",
    incompleteFilterResult.data,
    [],
  );
  TestValidator.equals(
    "filter incomplete records",
    incompleteFilterResult.pagination.records,
    0,
  );
  // 6. Test with various sort options - all should return empty
  const sortByCreatedResult = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortByCreatedResult);
  TestValidator.equals(
    "sort created_at empty data",
    sortByCreatedResult.data,
    [],
  );
  const sortByStartDateResult = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        sortBy: "start_date",
        sortOrder: "asc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortByStartDateResult);
  TestValidator.equals(
    "sort start_date empty data",
    sortByStartDateResult.data,
    [],
  );
  const sortByDueDateResult = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        sortBy: "due_date",
        sortOrder: "desc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortByDueDateResult);
  TestValidator.equals(
    "sort due_date empty data",
    sortByDueDateResult.data,
    [],
  );
  // 7. Test with various pagination parameters
  const paginatedResult = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: { page: 1, limit: 10 } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.equals("paginated empty data", paginatedResult.data, []);
  TestValidator.equals("paginated limit", paginatedResult.pagination.limit, 10);
  TestValidator.equals(
    "paginated records",
    paginatedResult.pagination.records,
    0,
  );
  // 8. Test with higher page number on empty list - should return empty
  const higherPageResult = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: { page: 5, limit: 20 } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(higherPageResult);
  TestValidator.equals("higher page empty data", higherPageResult.data, []);
  TestValidator.equals(
    "higher page current",
    higherPageResult.pagination.current,
    5,
  );
  // 9. Test combined parameters (filter + sort + pagination) - all should return empty
  const combinedResult = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        filter: "all",
        sortBy: "created_at",
        sortOrder: "desc",
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(combinedResult);
  TestValidator.equals("combined params empty data", combinedResult.data, []);
  TestValidator.equals(
    "combined params records",
    combinedResult.pagination.records,
    0,
  );
  // 10. Privacy check: another user should not see this user's todos (also empty)
  const anotherUserConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(anotherUserConnection, {});
  const anotherUserResult = await api.functional.todoApp.user.todos.index(
    anotherUserConnection,
    {
      body: {} satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(anotherUserResult);
  TestValidator.equals("another user empty data", anotherUserResult.data, []);
}
