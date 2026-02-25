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
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_search_empty_results_handling(
  connection: api.IConnection,
): Promise<void> {
  // Setup user account
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Create some initial todos
  const todo1 = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: { title: "First todo for testing" } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1);
  const todo2 = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: { title: "Second todo item" } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo2);
  // Test 1: Search for text that doesn't match any todo titles
  const searchResult1 = await api.functional.todoApp.user.search(
    userConnection,
    {
      body: {
        search: "xylophone_zebra_unmatchable_string_12345",
        completion_status: "all",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(searchResult1);
  TestValidator.equals(
    "empty array for non-matching search",
    searchResult1.data,
    [],
  );
  TestValidator.equals(
    "records count shows 0 for non-matching search",
    searchResult1.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count shows 0 for non-matching search",
    searchResult1.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page remains 1",
    searchResult1.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit remains unchanged",
    searchResult1.pagination.limit,
    10,
  );
  // Test 2: Filter by completion_status='complete' when user has no completed todos
  const searchResult2 = await api.functional.todoApp.user.search(
    userConnection,
    {
      body: {
        completion_status: "complete",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(searchResult2);
  TestValidator.equals(
    "empty array for complete filter",
    searchResult2.data,
    [],
  );
  TestValidator.equals(
    "records count shows 0 for complete filter",
    searchResult2.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count shows 0 for complete filter",
    searchResult2.pagination.pages,
    0,
  );
  // Test 3: Verify proper pagination structure with different limit values for empty results
  const searchResult3 = await api.functional.todoApp.user.search(
    userConnection,
    {
      body: {
        search: "another_unmatchable_query",
        completion_status: "all",
        page: 2,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(searchResult3);
  TestValidator.equals(
    "empty array persists with different pagination",
    searchResult3.data,
    [],
  );
  TestValidator.equals(
    "records count remains 0",
    searchResult3.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count remains 0",
    searchResult3.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page respects input",
    searchResult3.pagination.current,
    2,
  );
  TestValidator.equals(
    "limit respects input",
    searchResult3.pagination.limit,
    20,
  );
  // Test 4: Combination of non-matching search and complete filter
  const searchResult4 = await api.functional.todoApp.user.search(
    userConnection,
    {
      body: {
        search: "unmatchable_query_with_complete_filter",
        completion_status: "complete",
        page: 1,
        limit: 5,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(searchResult4);
  TestValidator.equals(
    "empty array for combination search",
    searchResult4.data,
    [],
  );
  TestValidator.equals(
    "records count shows 0 for combination search",
    searchResult4.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count shows proper calculation for 0 records",
    searchResult4.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page remains 1",
    searchResult4.pagination.current,
    1,
  );
  TestValidator.equals("limit remains 5", searchResult4.pagination.limit, 5);
}
