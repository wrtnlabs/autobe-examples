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
 * Test complex queries combining search, filtering, and sorting parameters
 * simultaneously.
 *
 * This test validates real-world task management scenarios where users need
 * sophisticated querying capabilities. It creates a diverse set of todos with
 * various titles and completion states, then executes queries that combine
 * multiple parameters to ensure all filtering, searching, and sorting logic
 * works correctly together.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a user account
 * 2. Populate the todo list with diverse todos containing specific keywords
 * 3. Mark some todos as completed to create varied completion states
 * 4. Execute combined queries (search + filter + sort)
 * 5. Validate that search filters by title correctly
 * 6. Validate that status filters by completion state correctly
 * 7. Validate that sorting orders the filtered results appropriately
 * 8. Test pagination with combined filters to ensure accurate result sets
 */
export async function test_api_todo_list_combined_search_filter_sort(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create diverse todos with specific keywords for search testing
  const todoTitles = [
    "Meeting with team about project planning",
    "Review meeting notes from yesterday",
    "Prepare presentation for client meeting",
    "Buy groceries for the week",
    "Complete code review for pull request",
    "Schedule dentist appointment",
    "Organize team meeting agenda",
    "Update project documentation",
    "Research new technologies",
    "Plan weekend activities",
  ] as const;

  const createdTodos: ITodoListTodo[] = await ArrayUtil.asyncMap(
    todoTitles,
    async (title) => {
      const todo = await api.functional.todoList.user.todos.create(connection, {
        body: {
          title: title,
        } satisfies ITodoListTodo.ICreate,
      });
      typia.assert(todo);
      return todo;
    },
  );

  // Step 3: Mark some todos as completed (todos with indices 0, 2, 4, 6)
  const completedIndices = [0, 2, 4, 6];
  for (const index of completedIndices) {
    const updated = await api.functional.todoList.user.todos.update(
      connection,
      {
        todoId: createdTodos[index].id,
        body: {
          completed: true,
        } satisfies ITodoListTodo.IUpdate,
      },
    );
    typia.assert(updated);
    createdTodos[index] = updated;
  }

  // Step 4: Test combined search + filter for incomplete todos
  const searchKeyword = "meeting";
  const incompleteWithMeetingResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        search: searchKeyword,
        status: "incomplete",
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(incompleteWithMeetingResult);

  // Validate search + filter results
  const expectedIncompleteWithMeeting = createdTodos.filter(
    (todo) =>
      todo.title.toLowerCase().includes(searchKeyword.toLowerCase()) &&
      !todo.completed,
  );

  TestValidator.equals(
    "incomplete todos with 'meeting' keyword count matches",
    incompleteWithMeetingResult.data.length,
    expectedIncompleteWithMeeting.length,
  );

  // Verify all returned todos contain the search keyword and are incomplete
  for (const todo of incompleteWithMeetingResult.data) {
    TestValidator.predicate(
      "todo title contains search keyword",
      todo.title.toLowerCase().includes(searchKeyword.toLowerCase()),
    );
    TestValidator.equals("todo is incomplete", todo.completed, false);
  }

  // Step 5: Test combined search + filter for completed todos
  const completedWithMeetingResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        search: searchKeyword,
        status: "completed",
        sort_by: "created_at",
        sort_order: "asc",
        page: 1,
        limit: 10,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(completedWithMeetingResult);

  const expectedCompletedWithMeeting = createdTodos.filter(
    (todo) =>
      todo.title.toLowerCase().includes(searchKeyword.toLowerCase()) &&
      todo.completed,
  );

  TestValidator.equals(
    "completed todos with 'meeting' keyword count matches",
    completedWithMeetingResult.data.length,
    expectedCompletedWithMeeting.length,
  );

  // Verify all returned todos contain the search keyword and are completed
  for (const todo of completedWithMeetingResult.data) {
    TestValidator.predicate(
      "completed todo title contains search keyword",
      todo.title.toLowerCase().includes(searchKeyword.toLowerCase()),
    );
    TestValidator.equals("todo is completed", todo.completed, true);
  }

  // Step 6: Test pagination with combined filters
  const paginatedResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        status: "incomplete",
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 3,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(paginatedResult);

  const expectedIncompleteTodos = createdTodos.filter(
    (todo) => !todo.completed,
  );

  TestValidator.equals(
    "pagination limit applied correctly",
    paginatedResult.data.length <= 3,
    true,
  );

  TestValidator.equals(
    "pagination total records matches incomplete count",
    paginatedResult.pagination.records,
    expectedIncompleteTodos.length,
  );

  // Step 7: Test sorting with descending order
  const sortedDescResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 20,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(sortedDescResult);

  // Verify descending order by checking timestamps
  for (let i = 0; i < sortedDescResult.data.length - 1; i++) {
    const current = new Date(sortedDescResult.data[i].created_at).getTime();
    const next = new Date(sortedDescResult.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      "todos sorted in descending order by created_at",
      current >= next,
    );
  }

  // Step 8: Test search without status filter
  const searchOnlyResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        search: "project",
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(searchOnlyResult);

  const expectedWithProject = createdTodos.filter((todo) =>
    todo.title.toLowerCase().includes("project"),
  );

  TestValidator.equals(
    "search-only query returns correct count",
    searchOnlyResult.data.length,
    expectedWithProject.length,
  );

  for (const todo of searchOnlyResult.data) {
    TestValidator.predicate(
      "todo title contains 'project' keyword",
      todo.title.toLowerCase().includes("project"),
    );
  }
}
