import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IETodoPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoPriority";
import type { IETodoRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoRole";
import type { IMemberCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IMemberCreate";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoTodo";
import type { ITodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoMember";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";

export async function test_api_member_todo_search_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Test member's todo list filtering and pagination comprehensively

  // 1. Create and authenticate member
  const email = typia.random<string & tags.Format<"email">>();
  const password = "password123";
  const member = await api.functional.auth.member.join(connection, {
    body: { email, password } satisfies IMemberCreate.IRequest,
  });
  typia.assert(member);

  // 2. Create a diverse set of test todos
  const priorities: IETodoPriority[] = ["Low", "Medium", "High"];
  const todosCreated: ITodoTodo[] = [];

  // Create 25 todos with different titles and priorities for comprehensive testing
  for (let i = 0; i < 25; i++) {
    const title = `Task ${i + 1}: ${RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 6 })}`;
    const priority = priorities[i % 3];

    const todo = await api.functional.todo.member.todos.create(connection, {
      body: { title, priority } satisfies ITodoTodo.ITodoCreate,
    });

    typia.assert(todo);
    TestValidator.equals(
      "todo member_id matches authenticated member",
      todo.member_id,
      member.id,
    );
    TestValidator.equals("new todos are incomplete", todo.completed, false);
    todosCreated.push(todo);
  }

  // 3. Test basic pagination functionality
  const pageSize = 10;
  TestValidator.equals(
    "created more than 10 todos for pagination test",
    todosCreated.length > pageSize,
    true,
  );

  // Get first page and verify pagination metadata
  const firstPage = await api.functional.todo.member.todos.index(connection, {
    body: { page: 1, limit: pageSize } satisfies ITodoTodo.IRequest,
  });

  typia.assert(firstPage);
  TestValidator.equals(
    "first page has correct limit",
    firstPage.pagination.limit,
    pageSize,
  );
  TestValidator.equals(
    "first page shows page 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page has expected record count",
    firstPage.pagination.records,
    todosCreated.length,
  );
  TestValidator.equals(
    "first page has correct item count",
    firstPage.data.length,
    pageSize,
  );
  TestValidator.equals(
    "has more pages when more todos exist",
    firstPage.pagination.pages > 1,
    true,
  );

  // Get second page and verify it's different
  const secondPage = await api.functional.todo.member.todos.index(connection, {
    body: { page: 2, limit: pageSize } satisfies ITodoTodo.IRequest,
  });

  typia.assert(secondPage);
  TestValidator.equals(
    "second page has different data",
    secondPage.data[0].id !== firstPage.data[0].id,
    true,
  );

  // 4. Test text search filtering by title
  const todoWithSearchableTitle = await api.functional.todo.member.todos.create(
    connection,
    {
      body: {
        title: "Important meeting notes about project alpha",
        priority: "High",
      } satisfies ITodoTodo.ITodoCreate,
    },
  );

  const searchTerm = "meeting";
  const searchResults = await api.functional.todo.member.todos.index(
    connection,
    {
      body: { search: searchTerm } satisfies ITodoTodo.IRequest,
    },
  );

  typia.assert(searchResults);
  TestValidator.predicate(
    "search results contain title with search term",
    searchResults.data.some((todo) =>
      todo.title.toLowerCase().includes(searchTerm.toLowerCase()),
    ),
  );

  // Verify search only returns matching todos
  for (const result of searchResults.data) {
    TestValidator.predicate(
      "each search result contains the search term",
      result.title.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }

  // 5. Test priority filtering
  const priorityFilteredHigh = await api.functional.todo.member.todos.index(
    connection,
    {
      body: { priority: "High" } satisfies ITodoTodo.IRequest,
    },
  );

  typia.assert(priorityFilteredHigh);
  for (const result of priorityFilteredHigh.data) {
    TestValidator.equals(
      "filtered results have High priority",
      result.priority,
      "High",
    );
  }

  const priorityFilteredMedium = await api.functional.todo.member.todos.index(
    connection,
    {
      body: { priority: "Medium" } satisfies ITodoTodo.IRequest,
    },
  );

  typia.assert(priorityFilteredMedium);
  for (const result of priorityFilteredMedium.data) {
    TestValidator.equals(
      "filtered results have Medium priority",
      result.priority,
      "Medium",
    );
  }

  // 6. Test combined filters (priority + search)
  const combinedFilters = await api.functional.todo.member.todos.index(
    connection,
    {
      body: {
        priority: "High",
        search: "meeting",
      } satisfies ITodoTodo.IRequest,
    },
  );

  typia.assert(combinedFilters);
  for (const result of combinedFilters.data) {
    TestValidator.equals(
      "combined filter has High priority",
      result.priority,
      "High",
    );
    TestValidator.predicate(
      "combined filter contains search term",
      result.title.toLowerCase().includes("meeting"),
    );
  }

  // 7. Test pagination with filters applied
  const filteredPaginationTest = await api.functional.todo.member.todos.index(
    connection,
    {
      body: {
        priority: "Medium",
        page: 1,
        limit: 5,
      } satisfies ITodoTodo.IRequest,
    },
  );

  typia.assert(filteredPaginationTest);
  TestValidator.equals(
    "filtered paginated results have Medium priority",
    filteredPaginationTest.data.every((todo) => todo.priority === "Medium"),
    true,
  );
  TestValidator.predicate(
    "page limit enforced",
    filteredPaginationTest.data.length <= 5,
  );
  TestValidator.predicate(
    "pagination records updated for filter",
    filteredPaginationTest.pagination.records < todosCreated.length,
  );

  // 8. Test completion status filtering (should only find incomplete todos since we didn't complete any)
  const completedFilter = await api.functional.todo.member.todos.index(
    connection,
    {
      body: {} satisfies ITodoTodo.IRequest, // All todos by default are incomplete
    },
  );

  typia.assert(completedFilter);
  TestValidator.equals(
    "all todos are incomplete",
    completedFilter.pagination.records,
    todosCreated.length,
  );
  TestValidator.equals(
    "all results are incomplete",
    completedFilter.data.every((todo) => todo.completed === false),
    true,
  );

  // 9. Test different pagination limits
  const smallPage = await api.functional.todo.member.todos.index(connection, {
    body: { limit: 5 } satisfies ITodoTodo.IRequest,
  });

  typia.assert(smallPage);
  TestValidator.equals("small page limit respected", smallPage.data.length, 5);

  const maxPage = await api.functional.todo.member.todos.index(connection, {
    body: { limit: 100 } satisfies ITodoTodo.IRequest,
  });

  typia.assert(maxPage);
  TestValidator.predicate(
    "max page limit respected",
    maxPage.data.length <= 25,
  );
  TestValidator.equals("max page limit is 100", maxPage.pagination.limit, 100);

  // 10. Test sorting functionality (create a todo to verify sort order)
  const todoWithAlphaTitle = await api.functional.todo.member.todos.create(
    connection,
    {
      body: {
        title: "Aardvark zoo management",
        priority: "High",
      } satisfies ITodoTodo.ITodoCreate,
    },
  );

  // Test sort by title
  const titleSorted = await api.functional.todo.member.todos.index(connection, {
    body: {
      sort_by: "title",
      page: 1,
      limit: 100,
    } satisfies ITodoTodo.IRequest,
  });

  typia.assert(titleSorted);
  const sortedTitles = titleSorted.data.map((todo) => todo.title);

  // Verify titles are in alphabetical order
  const isAlphabetical = sortedTitles.every((title, index) => {
    if (index === 0) return true;
    return title >= sortedTitles[index - 1];
  });

  TestValidator.equals(
    "todos are sorted alphabetically by title",
    isAlphabetical,
    true,
  );

  // Test sort by priority
  const prioritySorted = await api.functional.todo.member.todos.index(
    connection,
    {
      body: {
        sort_by: "priority",
        page: 1,
        limit: 100,
      } satisfies ITodoTodo.IRequest,
    },
  );

  typia.assert(prioritySorted);
  const priorityOrder = ["Low", "Medium", "High"];

  const isPrioritySorted = prioritySorted.data.every((todo, index) => {
    if (index === 0) return true;
    const currentIndex = priorityOrder.indexOf(todo.priority);
    const prevIndex = priorityOrder.indexOf(
      prioritySorted.data[index - 1].priority,
    );
    return currentIndex >= prevIndex;
  });

  TestValidator.equals(
    "todos are sorted by priority level",
    isPrioritySorted,
    true,
  );

  // 11. Verify member isolation - only authenticated member's todos are returned
  // Create a different member to test isolation
  const secondEmail = typia.random<string & tags.Format<"email">>();
  const secondMemberConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await api.functional.auth.member.join(secondMemberConnection, {
    body: {
      email: secondEmail,
      password: "password456",
    } satisfies IMemberCreate.IRequest,
  });

  // This second member creates todos
  await api.functional.todo.member.todos.create(secondMemberConnection, {
    body: {
      title: "Second member's task",
      priority: "Low",
    } satisfies ITodoTodo.ITodoCreate,
  });

  // Original member's filter should not include second member's todos
  const isolatedResults = await api.functional.todo.member.todos.index(
    connection,
    {
      body: {} satisfies ITodoTodo.IRequest,
    },
  );

  typia.assert(isolatedResults);
  TestValidator.equals(
    "original member's results don't include second member's todos",
    isolatedResults.pagination.records,
    todosCreated.length,
  );
  TestValidator.predicate(
    "no second member tasks found in original member's results",
    !isolatedResults.data.some((todo) => todo.title === "Second member's task"),
  );
}
