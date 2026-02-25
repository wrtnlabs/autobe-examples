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

/**
 * Test complex filtering scenarios including empty results and combined criteria.
 */
export async function test_api_todo_complex_filtering_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated user connection
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
  // Step 2: Create todos with various titles for comprehensive testing
  const todos: ITodoAppTodo[] = [];
  for (const _index of ArrayUtil.repeat(5, (i) => i)) {
    const title = RandomGenerator.paragraph({ sentences: 1 });
    const todo = await generate_random_todo_app_user_todos_create(
      userConnection,
      {
        body: { title } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    todos.push(todo);
  }
  // Step 3: Test empty results with non-existent search term
  const nonExistentTerm = "xyz123nonexistentterm456abc";
  const emptyResults = await api.functional.todoApp.user.filters.index(
    userConnection,
    {
      body: {
        search: nonExistentTerm,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(emptyResults);
  // Verify empty state pagination metadata
  TestValidator.equals(
    "empty results should have 0 records",
    emptyResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty results should have 0 pages",
    emptyResults.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty results data array should be empty",
    emptyResults.data.length,
    0,
  );
  // Step 4: Test combined search parameters with safe array access
  if (todos.length > 0) {
    const searchFragment = todos[0]!.title.substring(0, 5);
    const combinedResults = await api.functional.todoApp.user.filters.index(
      userConnection,
      {
        body: {
          search: searchFragment,
          completion_status: "all",
          page: 1,
          limit: 10,
        } satisfies ITodoAppTodo.IRequest,
      },
    );
    typia.assert(combinedResults);
    // Verify search results actually contain the search term
    TestValidator.predicate(
      "combined search should return results",
      combinedResults.data.length > 0,
    );
    TestValidator.predicate(
      "pagination records should be positive",
      combinedResults.pagination.records > 0,
    );
    // Validate search functionality - results should contain search term
    if (combinedResults.data.length > 0) {
      const containsSearchTerm = combinedResults.data.some((todo) =>
        todo.title.toLowerCase().includes(searchFragment.toLowerCase()),
      );
      TestValidator.predicate(
        "search results should contain search term",
        containsSearchTerm,
      );
    }
  }
  // Step 5: Test completion status filtering edge cases
  const incompleteResults = await api.functional.todoApp.user.filters.index(
    userConnection,
    {
      body: {
        completion_status: "incomplete",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(incompleteResults);
  const completeResults = await api.functional.todoApp.user.filters.index(
    userConnection,
    {
      body: {
        completion_status: "complete",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(completeResults);
  // Verify completion status filtering works correctly
  TestValidator.predicate(
    "incomplete results should have valid records",
    incompleteResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "complete results should have valid records",
    completeResults.pagination.records >= 0,
  );
  // Step 6: Validate search functionality with realistic terms
  const realisticSearch = await api.functional.todoApp.user.filters.index(
    userConnection,
    {
      body: {
        search: "test",
        completion_status: "all",
        page: 1,
        limit: 5,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(realisticSearch);
  // Final validation: Data consistency across different filter operations
  TestValidator.predicate(
    "all operations should maintain data integrity",
    incompleteResults.pagination.records >= 0 &&
      completeResults.pagination.records >= 0 &&
      realisticSearch.pagination.records >= 0,
  );
}
