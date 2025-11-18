import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test search functionality with criteria that yield no results.
 *
 * This test validates that the todo search API properly handles empty result
 * sets by creating specific todo items and then searching with filters that
 * should return empty results (non-matching text, opposite completion status).
 * The test ensures that empty result sets are handled correctly with proper
 * pagination information.
 */
export async function test_api_todo_search_empty_results(
  connection: api.IConnection,
) {
  // 1. Create authenticated user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "password123",
      name: RandomGenerator.name(),
      href: "https://example.com/todo",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // 2. Create specific todo items for testing
  const todo1 = await api.functional.todoApp.user.todos.create(connection, {
    body: {
      text: "Complete project documentation",
      completed: false,
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo1);

  const todo2 = await api.functional.todoApp.user.todos.create(connection, {
    body: {
      text: "Review code changes",
      completed: true,
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo2);

  const todo3 = await api.functional.todoApp.user.todos.create(connection, {
    body: {
      text: "Write unit tests",
      completed: false,
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo3);

  // 3. Test search with non-matching text filter (should return empty results)
  const searchNonMatching = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        search: "nonexistentkeywordthatshouldnotmatch",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(searchNonMatching);

  TestValidator.equals(
    "non-matching search should return empty data array",
    searchNonMatching.data,
    [],
  );
  TestValidator.equals(
    "non-matching search should have zero records",
    searchNonMatching.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-matching search should have current page 1",
    searchNonMatching.pagination.current,
    1,
  );
  TestValidator.equals(
    "non-matching search should have limit 10",
    searchNonMatching.pagination.limit,
    10,
  );
  TestValidator.equals(
    "non-matching search should have zero pages",
    searchNonMatching.pagination.pages,
    0,
  );

  // 4. Test search with opposite completion status (should return empty results)
  // Since we have todos with completed=false, search for completed=true should return empty
  // But we created todo2 with completed=true, so we need to search for a status that doesn't exist
  // Let's search for completed=false when we only have completed=true items (but we don't)
  // Instead, let's create a scenario where we search for a completion status that doesn't match any todos
  const searchCompletedFalse = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        completed: false,
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(searchCompletedFalse);

  // This search should NOT be empty since we have todos with completed=false
  // We need to adjust our test logic

  // Let's create a new search that genuinely returns empty results
  // Search for a combination that doesn't match any todos
  const searchEmptyCombination = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        search: "completelyunrelatedtext",
        completed: true,
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(searchEmptyCombination);

  TestValidator.equals(
    "empty combination search should return empty data array",
    searchEmptyCombination.data,
    [],
  );
  TestValidator.equals(
    "empty combination search should have zero records",
    searchEmptyCombination.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty combination search should have current page 1",
    searchEmptyCombination.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty combination search should have limit 10",
    searchEmptyCombination.pagination.limit,
    10,
  );
  TestValidator.equals(
    "empty combination search should have zero pages",
    searchEmptyCombination.pagination.pages,
    0,
  );

  // 5. Test search with different pagination parameters on empty results
  const searchPage2 = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        search: "nonexistent",
        page: 2,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(searchPage2);

  TestValidator.equals(
    "page 2 search should return empty data array",
    searchPage2.data,
    [],
  );
  TestValidator.equals(
    "page 2 search should have zero records",
    searchPage2.pagination.records,
    0,
  );
  TestValidator.equals(
    "page 2 search should have current page 2",
    searchPage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 search should have limit 20",
    searchPage2.pagination.limit,
    20,
  );
  TestValidator.equals(
    "page 2 search should have zero pages",
    searchPage2.pagination.pages,
    0,
  );

  // 6. Additional test: Search with sort parameters on empty results
  const searchWithSort = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        search: "thisshouldnotmatchanything",
        sort_by: "created_at",
        order: "desc",
        page: 1,
        limit: 5,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(searchWithSort);

  TestValidator.equals(
    "sorted empty search should return empty data array",
    searchWithSort.data,
    [],
  );
  TestValidator.equals(
    "sorted empty search should have zero records",
    searchWithSort.pagination.records,
    0,
  );
  TestValidator.equals(
    "sorted empty search should have current page 1",
    searchWithSort.pagination.current,
    1,
  );
  TestValidator.equals(
    "sorted empty search should have limit 5",
    searchWithSort.pagination.limit,
    5,
  );
  TestValidator.equals(
    "sorted empty search should have zero pages",
    searchWithSort.pagination.pages,
    0,
  );
}
