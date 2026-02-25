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

export async function test_api_todo_search_keyword_matching(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Create test todos with different titles for keyword search testing
  const todo1 = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: "Buy groceries including milk and eggs",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1);
  const todo2 = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: "Complete milk delivery system documentation",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo2);
  const todo3 = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: "Schedule meeting about quarterly earnings",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo3);
  // Test partial matching - search for "milk"
  const searchMilk = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        search: "milk",
        completion_status: "all",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(searchMilk);
  // Verify only todos containing "milk" are returned
  const milkTitles = searchMilk.data.map((todo) => todo.title);
  TestValidator.equals("milk search results count", searchMilk.data.length, 2);
  TestValidator.predicate(
    "todo1 contains milk",
    milkTitles.includes(todo1.title),
  );
  TestValidator.predicate(
    "todo2 contains milk",
    milkTitles.includes(todo2.title),
  );
  TestValidator.predicate(
    "todo3 not in milk search",
    !milkTitles.includes(todo3.title),
  );
  // Test partial matching - search for "quarterly"
  const searchQuarterly = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        search: "quarterly",
        completion_status: "all",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(searchQuarterly);
  // Verify only todo containing "quarterly" is returned
  const quarterlyTitles = searchQuarterly.data.map((todo) => todo.title);
  TestValidator.equals(
    "quarterly search results count",
    searchQuarterly.data.length,
    1,
  );
  TestValidator.predicate(
    "todo3 contains quarterly",
    quarterlyTitles.includes(todo3.title),
  );
  // Test empty search term (should return all todos)
  const emptySearch = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        search: "",
        completion_status: "all",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(emptySearch);
  // Verify all created todos are returned
  TestValidator.equals(
    "empty search returns all todos",
    emptySearch.data.length,
    3,
  );
  const allTitles = emptySearch.data.map((todo) => todo.title);
  TestValidator.predicate(
    "all todos present",
    allTitles.includes(todo1.title) &&
      allTitles.includes(todo2.title) &&
      allTitles.includes(todo3.title),
  );
  // Test search term with no matches (should return empty)
  const noMatchSearch = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        search: "xyz123nonexistent",
        completion_status: "all",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(noMatchSearch);
  // Verify no results returned for non-matching search
  TestValidator.equals(
    "no match search returns empty",
    noMatchSearch.data.length,
    0,
  );
  // Test search with pagination
  const paginatedSearch = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        search: "milk",
        completion_status: "all",
        page: 1,
        limit: 1,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(paginatedSearch);
  // Verify pagination works correctly - should return 1 result but total records should be 2
  TestValidator.equals(
    "pagination limit respected",
    paginatedSearch.data.length,
    1,
  );
  TestValidator.equals(
    "pagination total records correct",
    paginatedSearch.pagination.records,
    2,
  );
  TestValidator.predicate(
    "pagination metadata valid",
    paginatedSearch.pagination.current === 1 &&
      paginatedSearch.pagination.limit === 1 &&
      paginatedSearch.pagination.pages === 2,
  );
}
