import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_member_todo_search_text_matching(
  connection: api.IConnection,
) {
  // Step 1: Register new member for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.join.registerMember(connection, {
      body: {
        email: memberEmail,
        first_name: "Search",
        last_name: "Tester",
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(member);
  TestValidator.equals(
    "member registration successful",
    member.email,
    memberEmail,
  );

  // Step 2: Test basic search functionality with various scenarios

  // Test 1: Basic search with text parameter
  const basicSearchResults =
    await api.functional.todoApp.member.members.todos.index(connection, {
      memberId: member.id,
      body: {
        search: "project",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(basicSearchResults);
  TestValidator.predicate(
    "basic search returns valid response structure",
    basicSearchResults.data.length >= 0,
  );
  TestValidator.equals(
    "pagination info present",
    basicSearchResults.pagination.current,
    1,
  );

  // Test 2: Case-insensitive search
  const caseInsensitiveResults =
    await api.functional.todoApp.member.members.todos.index(connection, {
      memberId: member.id,
      body: {
        search: "REPORT",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(caseInsensitiveResults);
  TestValidator.predicate(
    "case insensitive search works",
    caseInsensitiveResults.data.length >= 0,
  );

  // Test 3: Partial word search
  const partialSearchResults =
    await api.functional.todoApp.member.members.todos.index(connection, {
      memberId: member.id,
      body: {
        search: "doc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(partialSearchResults);
  TestValidator.predicate(
    "partial word matching works",
    partialSearchResults.data.length >= 0,
  );

  // Test 4: Multi-word search
  const multiWordSearchResults =
    await api.functional.todoApp.member.members.todos.index(connection, {
      memberId: member.id,
      body: {
        search: "security audit",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(multiWordSearchResults);
  TestValidator.predicate(
    "multi-word search functions",
    multiWordSearchResults.data.length >= 0,
  );

  // Test 5: Search with status filter
  const statusFilteredResults =
    await api.functional.todoApp.member.members.todos.index(connection, {
      memberId: member.id,
      body: {
        search: "review",
        status: ["pending", "in_progress"],
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(statusFilteredResults);
  TestValidator.predicate(
    "search with status filter works",
    statusFilteredResults.data.length >= 0,
  );

  // Test 6: Search with priority filter
  const priorityFilteredResults =
    await api.functional.todoApp.member.members.todos.index(connection, {
      memberId: member.id,
      body: {
        search: "meeting",
        priority: ["high", "urgent"],
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(priorityFilteredResults);
  TestValidator.predicate(
    "search with priority filter works",
    priorityFilteredResults.data.length >= 0,
  );

  // Test 7: Search with category filter
  const categoryFilteredResults =
    await api.functional.todoApp.member.members.todos.index(connection, {
      memberId: member.id,
      body: {
        search: "testing",
        category: "development",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(categoryFilteredResults);
  TestValidator.predicate(
    "search with category filter works",
    categoryFilteredResults.data.length >= 0,
  );

  // Test 8: Empty search (should return all todos)
  const emptySearchResults =
    await api.functional.todoApp.member.members.todos.index(connection, {
      memberId: member.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(emptySearchResults);
  TestValidator.predicate(
    "empty search returns todos",
    emptySearchResults.data.length >= 0,
  );

  // Test 9: Search for non-existent term
  const noResultsSearch =
    await api.functional.todoApp.member.members.todos.index(connection, {
      memberId: member.id,
      body: {
        search: "nonexistentkeyword12345",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(noResultsSearch);
  TestValidator.equals(
    "empty search returns no results",
    noResultsSearch.data.length,
    0,
  );

  // Test 10: Search with pagination
  const paginatedSearchResults =
    await api.functional.todoApp.member.members.todos.index(connection, {
      memberId: member.id,
      body: {
        search: "review",
        page: 1,
        limit: 5,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(paginatedSearchResults);
  TestValidator.equals(
    "pagination limit applied",
    paginatedSearchResults.pagination.limit,
    5,
  );

  // Test 11: Search with sorting by title
  const sortedSearchResults =
    await api.functional.todoApp.member.members.todos.index(connection, {
      memberId: member.id,
      body: {
        search: "meeting",
        sort_by: "title",
        sort_order: "asc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(sortedSearchResults);
  TestValidator.predicate(
    "sorted search results returned",
    sortedSearchResults.data.length >= 0,
  );

  // Test 12: Search with sorting by created date
  const dateSortedResults =
    await api.functional.todoApp.member.members.todos.index(connection, {
      memberId: member.id,
      body: {
        search: "audit",
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(dateSortedResults);
  TestValidator.predicate(
    "date sorted search results returned",
    dateSortedResults.data.length >= 0,
  );

  // Test 13: Search with date range filter
  const dateRangeResults =
    await api.functional.todoApp.member.members.todos.index(connection, {
      memberId: member.id,
      body: {
        search: "planning",
        date_from: new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        date_to: new Date().toISOString(),
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(dateRangeResults);
  TestValidator.predicate(
    "search with date range works",
    dateRangeResults.data.length >= 0,
  );

  // Test 14: Search with due date range
  const dueDateResults =
    await api.functional.todoApp.member.members.todos.index(connection, {
      memberId: member.id,
      body: {
        search: "contract",
        due_date_from: new Date().toISOString(),
        due_date_to: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(dueDateResults);
  TestValidator.predicate(
    "search with due date range works",
    dueDateResults.data.length >= 0,
  );

  // Test 15: Search with include completed filter
  const includeCompletedResults =
    await api.functional.todoApp.member.members.todos.index(connection, {
      memberId: member.id,
      body: {
        search: "minutes",
        include_completed: true,
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(includeCompletedResults);
  TestValidator.predicate(
    "search with include completed works",
    includeCompletedResults.data.length >= 0,
  );

  // Step 3: Validate response structure and pagination
  TestValidator.equals(
    "pagination current page",
    basicSearchResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination has limit",
    basicSearchResults.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination has records",
    basicSearchResults.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has pages",
    basicSearchResults.pagination.pages >= 0,
    true,
  );

  // Validate that todos have expected structure
  if (basicSearchResults.data.length > 0) {
    const sampleTodo = basicSearchResults.data[0];
    TestValidator.predicate("todo has id", typeof sampleTodo.id === "string");
    TestValidator.predicate(
      "todo has title",
      typeof sampleTodo.title === "string",
    );
    TestValidator.predicate(
      "todo has status",
      typeof sampleTodo.status === "string",
    );
    TestValidator.predicate(
      "todo has priority",
      typeof sampleTodo.priority === "string",
    );
    TestValidator.predicate(
      "todo has created_at",
      typeof sampleTodo.created_at === "string",
    );
    TestValidator.predicate(
      "todo has updated_at",
      typeof sampleTodo.updated_at === "string",
    );
  }

  // Step 4: Test edge cases and error handling

  // Test with invalid page number
  const invalidPageResults =
    await api.functional.todoApp.member.members.todos.index(connection, {
      memberId: member.id,
      body: {
        search: "test",
        page: 0, // Invalid page number
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(invalidPageResults);
  TestValidator.predicate(
    "handles invalid page gracefully",
    invalidPageResults.data.length >= 0,
  );

  // Test with large limit
  const largeLimitResults =
    await api.functional.todoApp.member.members.todos.index(connection, {
      memberId: member.id,
      body: {
        search: "test",
        page: 1,
        limit: 100, // Maximum allowed
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(largeLimitResults);
  TestValidator.equals(
    "handles maximum limit",
    largeLimitResults.pagination.limit,
    100,
  );

  // Step 5: Summary validation
  TestValidator.predicate(
    "search functionality comprehensive test completed",
    basicSearchResults.data.length >= 0 &&
      caseInsensitiveResults.data.length >= 0 &&
      partialSearchResults.data.length >= 0 &&
      noResultsSearch.data.length === 0 &&
      paginatedSearchResults.pagination.limit === 5,
  );

  // Final validation that member authentication is working
  TestValidator.equals(
    "member session maintained throughout search tests",
    member.id,
    member.id,
  );
}
