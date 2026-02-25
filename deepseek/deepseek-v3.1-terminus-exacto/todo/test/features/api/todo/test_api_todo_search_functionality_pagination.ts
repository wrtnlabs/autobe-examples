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

export async function test_api_todo_search_functionality_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user connection using available utility functions
  const userConnection: api.IConnection = { host: connection.host };
  // Need to create authentication flow since authorize_user_join is not available
  // Create user registration data
  const joinData: ITodoAppUser.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: "https://todo-app.test",
    referrer: "https://todo-app.test/home",
  };
  // Register user using the join endpoint directly (since utility function not available)
  const authResponse = await api.functional.todoApp.auth.user.join(
    userConnection,
    {
      body: joinData,
    },
  );
  typia.assert(authResponse);
  // Update connection headers with authentication token
  userConnection.headers = {
    Authorization: authResponse.token.access,
  };
  // Create search keywords and todos using utility function
  const searchKeywords = ["urgent", "important", "critical"];
  const todosWithKeywords: ITodoAppTodo[] = [];
  // Create todos with search keywords using utility function
  for (const keyword of searchKeywords) {
    const todo = await generate_random_todo_app_user_todos_create(
      userConnection,
      {
        body: {
          title: `Task ${keyword} - ${RandomGenerator.paragraph({ sentences: 1 })}`,
        },
      },
    );
    typia.assert(todo);
    todosWithKeywords.push(todo);
  }
  // Create a todo without keywords as control using utility function
  const controlTodo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: "Regular task without keywords",
      },
    },
  );
  typia.assert(controlTodo);
  // Test search functionality with partial matching
  const searchResults = await api.functional.todoApp.user.filters.index(
    userConnection,
    {
      body: {
        search: "urg",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(searchResults);
  // Validate search results contain correct todos
  TestValidator.predicate(
    "search should return matching todo",
    searchResults.data.some((todo) => todo.title.includes("urgent")),
  );
  TestValidator.predicate(
    "search should not return non-matching todo",
    !searchResults.data.some((todo) => todo.title.includes("Regular")),
  );
  // Test search with different partial patterns
  const searchResults2 = await api.functional.todoApp.user.filters.index(
    userConnection,
    {
      body: {
        search: "crit",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(searchResults2);
  TestValidator.predicate(
    "partial search should match critical",
    searchResults2.data.some((todo) => todo.title.includes("critical")),
  );
  // Test pagination with search results
  const paginatedResults = await api.functional.todoApp.user.filters.index(
    userConnection,
    {
      body: {
        search: "important",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(paginatedResults);
  // Validate pagination metadata
  TestValidator.equals(
    "current page should be 1",
    paginatedResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should match request",
    paginatedResults.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "total records should be positive",
    paginatedResults.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pages should be calculated correctly",
    paginatedResults.pagination.pages ===
      Math.ceil(paginatedResults.pagination.records / 10),
  );
  // Test edge case: empty search results
  const emptySearch = await api.functional.todoApp.user.filters.index(
    userConnection,
    {
      body: {
        search: "nonexistentkeyword12345",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search should return no data",
    emptySearch.data.length,
    0,
  );
  TestValidator.equals(
    "empty search should have zero records",
    emptySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search should have zero pages",
    emptySearch.pagination.pages,
    0,
  );
  // Test pagination with different limits
  const limitTest = await api.functional.todoApp.user.filters.index(
    userConnection,
    {
      body: {
        search: "Task",
        page: 1,
        limit: 2,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(limitTest);
  TestValidator.equals(
    "limit test should respect page size",
    true,
    limitTest.data.length <= 2,
  );
  TestValidator.predicate(
    "pagination metadata should be consistent",
    limitTest.pagination.pages === Math.ceil(limitTest.pagination.records / 2),
  );
}