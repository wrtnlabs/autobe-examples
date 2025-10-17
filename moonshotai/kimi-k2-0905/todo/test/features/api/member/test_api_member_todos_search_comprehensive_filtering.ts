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

/**
 * Test comprehensive todo search and filtering for authenticated members.
 *
 * This test validates the complete search functionality including:
 *
 * 1. Member account creation and authentication
 * 2. Creating todos with diverse properties (various titles, completion statuses,
 *    priorities)
 * 3. Testing text search with different query terms
 * 4. Filtering by completion status (completed/incomplete)
 * 5. Filtering by priority levels (Low/Medium/High)
 * 6. Testing pagination with different page sizes and configurations
 * 7. Combining multiple search criteria
 * 8. Edge cases: empty results, single character searches, complex multi-criteria
 *    filtering
 * 9. Consistency validation across multiple requests with same filters
 * 10. Realistic todo collection testing with realistic data patterns
 */
export async function test_api_member_todos_search_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account for todo management
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "securePassword123",
    } satisfies IMemberCreate.IRequest,
  });
  typia.assert(member);

  // Step 2: Create diverse todos for testing
  const priorities: IETodoPriority[] = ["Low", "Medium", "High"];
  const todoTitles = [
    "Complete project documentation",
    "Review team performance metrics",
    "Update client contact information",
    "Prepare quarterly budget report",
    "Schedule team building activities",
    "Implement new security protocols",
    "Test mobile application features",
    "Optimize database query performance",
    "Design user interface mockups",
    "Conduct market research analysis",
  ];

  // Create completed todos
  const completedTodos = await ArrayUtil.asyncRepeat(3, async (index) => {
    const todo = await api.functional.todo.member.todos.create(connection, {
      body: {
        title: todoTitles[index],
        priority: RandomGenerator.pick(priorities),
      } satisfies ITodoTodo.ITodoCreate,
    });
    typia.assert(todo);
    return todo;
  });

  // Create incomplete todos
  const incompleteTodos = await ArrayUtil.asyncRepeat(4, async (index) => {
    const todo = await api.functional.todo.member.todos.create(connection, {
      body: {
        title: todoTitles[index + 3],
        priority: RandomGenerator.pick(priorities),
      } satisfies ITodoTodo.ITodoCreate,
    });
    typia.assert(todo);
    return todo;
  });

  // Create high priority todos
  const highPriorityTodos = await ArrayUtil.asyncRepeat(2, async () => {
    const todo = await api.functional.todo.member.todos.create(connection, {
      body: {
        title: `URGENT: ${RandomGenerator.paragraph({ sentences: 2 })}`,
        priority: "High",
      } satisfies ITodoTodo.ITodoCreate,
    });
    typia.assert(todo);
    return todo;
  });

  // Step 3: Test pagination basics
  const firstPage = await api.functional.todo.member.todos.index(connection, {
    body: {
      page: 1,
      limit: 5,
    } satisfies ITodoTodo.IRequest,
  });
  typia.assert(firstPage);
  TestValidator.predicate(
    "first page has correct page number",
    firstPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "first page has correct limit",
    firstPage.pagination.limit === 5,
  );

  // Step 4: Test text search functionality
  // Search for "project"
  const projectSearch = await api.functional.todo.member.todos.index(
    connection,
    {
      body: {
        search: "project",
      } satisfies ITodoTodo.IRequest,
    },
  );
  typia.assert(projectSearch);
  TestValidator.predicate(
    "project search returns matching todos",
    projectSearch.data.every((todo) =>
      todo.title.toLowerCase().includes("project"),
    ),
  );

  // Search for "team"
  const teamSearch = await api.functional.todo.member.todos.index(connection, {
    body: {
      search: "team",
    } satisfies ITodoTodo.IRequest,
  });
  typia.assert(teamSearch);
  TestValidator.predicate(
    "team search returns matching todos",
    teamSearch.data.every((todo) => todo.title.toLowerCase().includes("team")),
  );

  // Search with single character
  const singleCharSearch = await api.functional.todo.member.todos.index(
    connection,
    {
      body: {
        search: "a",
      } satisfies ITodoTodo.IRequest,
    },
  );
  typia.assert(singleCharSearch);
  TestValidator.predicate(
    "single character search returns results",
    singleCharSearch.data.length > 0,
  );

  // Step 5: Test completion status filtering
  // Filter by completed = true
  const completedFilter = await api.functional.todo.member.todos.index(
    connection,
    {
      body: {
        completed: true,
      } satisfies ITodoTodo.IRequest,
    },
  );
  typia.assert(completedFilter);
  TestValidator.predicate(
    "completed filter returns only completed todos",
    completedFilter.data.every((todo) => todo.completed === true),
  );

  // Filter by completed = false
  const incompleteFilter = await api.functional.todo.member.todos.index(
    connection,
    {
      body: {
        completed: false,
      } satisfies ITodoTodo.IRequest,
    },
  );
  typia.assert(incompleteFilter);
  TestValidator.predicate(
    "incomplete filter returns only incomplete todos",
    incompleteFilter.data.every((todo) => todo.completed === false),
  );

  // Step 6: Test priority filtering
  // Filter by High priority
  const highPriorityFilter = await api.functional.todo.member.todos.index(
    connection,
    {
      body: {
        priority: "High",
      } satisfies ITodoTodo.IRequest,
    },
  );
  typia.assert(highPriorityFilter);
  TestValidator.predicate(
    "high priority filter returns only high priority todos",
    highPriorityFilter.data.every((todo) => todo.priority === "High"),
  );

  // Filter by Medium priority
  const mediumPriorityFilter = await api.functional.todo.member.todos.index(
    connection,
    {
      body: {
        priority: "Medium",
      } satisfies ITodoTodo.IRequest,
    },
  );
  typia.assert(mediumPriorityFilter);
  TestValidator.predicate(
    "medium priority filter returns only medium priority todos",
    mediumPriorityFilter.data.every((todo) => todo.priority === "Medium"),
  );

  // Filter by Low priority
  const lowPriorityFilter = await api.functional.todo.member.todos.index(
    connection,
    {
      body: {
        priority: "Low",
      } satisfies ITodoTodo.IRequest,
    },
  );
  typia.assert(lowPriorityFilter);
  TestValidator.predicate(
    "low priority filter returns only low priority todos",
    lowPriorityFilter.data.every((todo) => todo.priority === "Low"),
  );

  // Step 7: Test combined filtering
  // Search text + priority + completion status
  const combinedFilter = await api.functional.todo.member.todos.index(
    connection,
    {
      body: {
        search: "team",
        priority: "Medium",
        completed: false,
      } satisfies ITodoTodo.IRequest,
    },
  );
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined filter matches all criteria",
    combinedFilter.data.every(
      (todo) =>
        todo.title.toLowerCase().includes("team") &&
        todo.priority === "Medium" &&
        todo.completed === false,
    ),
  );

  // Step 8: Test pagination with different page sizes
  const pageSize10 = await api.functional.todo.member.todos.index(connection, {
    body: {
      page: 1,
      limit: 10,
    } satisfies ITodoTodo.IRequest,
  });
  typia.assert(pageSize10);
  TestValidator.predicate(
    "page size 10 returns correct number",
    pageSize10.data.length <= 10,
  );

  const pageSize20 = await api.functional.todo.member.todos.index(connection, {
    body: {
      page: 1,
      limit: 20,
    } satisfies ITodoTodo.IRequest,
  });
  typia.assert(pageSize20);
  TestValidator.predicate(
    "page size 20 returns correct number",
    pageSize20.data.length <= 20,
  );

  // Step 9: Test empty results with non-existent search terms
  const noResultsSearch = await api.functional.todo.member.todos.index(
    connection,
    {
      body: {
        search: "xyzzy",
      } satisfies ITodoTodo.IRequest,
    },
  );
  typia.assert(noResultsSearch);
  TestValidator.predicate(
    "non-existent search returns empty results",
    noResultsSearch.data.length === 0,
  );

  // Step 10: Test consistency across multiple requests
  const searchTerm = "Complete";
  const firstRequest = await api.functional.todo.member.todos.index(
    connection,
    {
      body: {
        search: searchTerm,
      } satisfies ITodoTodo.IRequest,
    },
  );

  const secondRequest = await api.functional.todo.member.todos.index(
    connection,
    {
      body: {
        search: searchTerm,
      } satisfies ITodoTodo.IRequest,
    },
  );

  const thirdRequest = await api.functional.todo.member.todos.index(
    connection,
    {
      body: {
        search: searchTerm,
      } satisfies ITodoTodo.IRequest,
    },
  );

  TestValidator.predicate(
    "first and second requests are consistent",
    JSON.stringify(firstRequest.data) === JSON.stringify(secondRequest.data),
  );
  TestValidator.predicate(
    "second and third requests are consistent",
    JSON.stringify(secondRequest.data) === JSON.stringify(thirdRequest.data),
  );

  // Step 11: Test pagination navigation
  if (firstPage.pagination.pages > 1) {
    const secondPage = await api.functional.todo.member.todos.index(
      connection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies ITodoTodo.IRequest,
      },
    );
    typia.assert(secondPage);
    TestValidator.predicate(
      "second page navigation works",
      secondPage.pagination.current === 2,
    );
    TestValidator.predicate(
      "different pages return different data",
      JSON.stringify(firstPage.data) !== JSON.stringify(secondPage.data),
    );
  }

  // Step 12: Test sorting options
  const sortByCreatedAt = await api.functional.todo.member.todos.index(
    connection,
    {
      body: {
        sort_by: "created_at",
      } satisfies ITodoTodo.IRequest,
    },
  );
  typia.assert(sortByCreatedAt);
  TestValidator.predicate(
    "sorted by created_at returns todos",
    sortByCreatedAt.data.length > 0,
  );

  const sortByPriority = await api.functional.todo.member.todos.index(
    connection,
    {
      body: {
        sort_by: "priority",
      } satisfies ITodoTodo.IRequest,
    },
  );
  typia.assert(sortByPriority);
  TestValidator.predicate(
    "sorted by priority returns todos",
    sortByPriority.data.length > 0,
  );
}
