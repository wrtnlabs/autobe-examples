import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodo";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test todo list search functionality using partial title matching.
 *
 * Creates a user account, then creates multiple todos with different titles
 * including some with common keywords. Uses the search parameter to perform
 * case-insensitive substring searches (e.g., searching 'meeting' should match
 * 'Team Meeting', 'Prepare meeting notes'). Verifies that only todos whose
 * titles contain the search term are returned, and that the search is
 * case-insensitive. Tests with various search terms to validate the partial
 * matching behavior works correctly. This validates the search-as-you-type
 * functionality that helps users quickly find specific tasks.
 */
export async function test_api_todo_list_search_by_title(
  connection: api.IConnection,
) {
  // 1. Create a user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // 2. Create multiple diverse todo items with varied titles
  const todoTitles = [
    "Team Meeting at 3pm",
    "Prepare meeting notes",
    "Buy groceries for dinner",
    "Review project documentation",
    "Schedule doctor appointment",
    "Meeting with client",
    "Update project timeline",
    "Grocery shopping list",
  ];

  const createdTodos: ITodoListTodo[] = [];
  for (const title of todoTitles) {
    const todo = await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: title,
      } satisfies ITodoListTodo.ICreate,
    });
    typia.assert(todo);
    createdTodos.push(todo);
  }

  // 3. Test search with "meeting" keyword (should match 3 todos)
  const meetingSearchResult = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        search: "meeting",
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(meetingSearchResult);

  // Verify that only todos containing "meeting" are returned
  const expectedMeetingTodos = createdTodos.filter((todo) =>
    todo.title.toLowerCase().includes("meeting"),
  );
  TestValidator.equals(
    "meeting search result count matches",
    meetingSearchResult.data.length,
    expectedMeetingTodos.length,
  );

  // 4. Test case-insensitive search with "MEETING" (uppercase)
  const uppercaseSearchResult = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        search: "MEETING",
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(uppercaseSearchResult);

  TestValidator.equals(
    "case-insensitive search returns same count",
    uppercaseSearchResult.data.length,
    expectedMeetingTodos.length,
  );

  // 5. Test search with "project" keyword
  const projectSearchResult = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        search: "project",
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(projectSearchResult);

  const expectedProjectTodos = createdTodos.filter((todo) =>
    todo.title.toLowerCase().includes("project"),
  );
  TestValidator.equals(
    "project search result count matches",
    projectSearchResult.data.length,
    expectedProjectTodos.length,
  );

  // 6. Test search with "grocer" (partial word match)
  const grocerSearchResult = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        search: "grocer",
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(grocerSearchResult);

  const expectedGrocerTodos = createdTodos.filter((todo) =>
    todo.title.toLowerCase().includes("grocer"),
  );
  TestValidator.equals(
    "partial word search result count matches",
    grocerSearchResult.data.length,
    expectedGrocerTodos.length,
  );

  // 7. Test search with non-existent keyword
  const noMatchSearchResult = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        search: "nonexistentkeyword123",
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(noMatchSearchResult);

  TestValidator.equals(
    "no match search returns empty",
    noMatchSearchResult.data.length,
    0,
  );

  // 8. Verify all returned todos actually contain the search term
  for (const todoSummary of meetingSearchResult.data) {
    TestValidator.predicate(
      "returned todo contains search term",
      todoSummary.title.toLowerCase().includes("meeting"),
    );
  }
}
