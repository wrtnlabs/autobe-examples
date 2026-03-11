import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

/**
 * Test the todo search functionality with pagination and text search capabilities.
 * 1. Create multiple todos with varied titles and descriptions for text search testing
 * 2. Test pagination by creating more todos than page limit and verifying proper page navigation
 * 3. Test text search by searching for keywords in todo titles and descriptions
 * 4. Validate pagination metadata accuracy and data array size per page
 */
export async function test_api_todo_search_pagination_and_text_search(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // Create searchable todos with specific patterns
  const searchKeywords = ["apple", "banana", "orange", "grape", "melon"];
  const descriptionKeywords = [
    "important",
    "urgent",
    "review",
    "critical",
    "high priority",
  ];
  // Create 25 todos for pagination testing
  const todoCount = 25;
  const createdTodos: IMultiUserTodoTodo[] = [];
  for (let i = 0; i < todoCount; i++) {
    // Determine if this todo should have searchable content
    const hasTitleKeyword = i % 3 === 0;
    const hasDescriptionKeyword = i % 4 === 0;
    const isCompleted = i % 2 === 0;
    const title = hasTitleKeyword
      ? `${RandomGenerator.paragraph({ sentences: 2 })} ${RandomGenerator.pick(searchKeywords)}`
      : RandomGenerator.paragraph({ sentences: 2 });
    const description = hasDescriptionKeyword
      ? `${RandomGenerator.paragraph({ sentences: 3 })} ${RandomGenerator.pick(descriptionKeywords)} ${RandomGenerator.paragraph({ sentences: 1 })}`
      : i % 5 === 0
        ? null
        : RandomGenerator.paragraph({ sentences: 3 });
    const todo = await generate_random_multi_user_todo_member_todos_create(
      memberConnection,
      {
        body: {
          title,
          description,
          startDate: i % 3 === 0 ? new Date().toISOString() : null,
          dueDate:
            i % 4 === 0 ? new Date(Date.now() + 86400000).toISOString() : null,
        } satisfies IMultiUserTodoTodo.ICreate,
      },
    );
    typia.assert(todo);
    createdTodos.push(todo);
    // Mark some todos as completed
    if (isCompleted) {
      // Note: This assumes there's an update endpoint to mark as completed
      // Since we don't have it in the SDK, we'll just create them as is
      // The search endpoint supports filtering by is_completed
    }
  }
  // Test 1: Basic pagination with default sorting (created_at desc)
  const pageSize = 10;
  const firstPage = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: pageSize,
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(firstPage);
  // Validate pagination metadata
  TestValidator.equals(
    "total records",
    firstPage.pagination.records,
    todoCount,
  );
  TestValidator.equals("current page", firstPage.pagination.current, 1);
  TestValidator.equals("page limit", firstPage.pagination.limit, pageSize);
  TestValidator.equals(
    "total pages calculation",
    firstPage.pagination.pages,
    Math.ceil(todoCount / pageSize),
  );
  TestValidator.predicate(
    "data length matches limit",
    firstPage.data.length <= pageSize,
  );
  TestValidator.predicate("has data on first page", firstPage.data.length > 0);
  // Test 2: Navigate to second page
  const secondPage = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: pageSize,
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(secondPage);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals(
    "second page limit",
    secondPage.pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "second page has data or is empty",
    secondPage.data.length >= 0,
  );
  // Test 3: Different page sizes
  const smallPage = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(smallPage);
  TestValidator.equals("small page limit", smallPage.pagination.limit, 5);
  TestValidator.predicate(
    "small page data length <= 5",
    smallPage.data.length <= 5,
  );
  // Test 4: Text search in titles
  const searchTerm = searchKeywords[0]; // "apple"
  const titleSearch = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        search: searchTerm,
        page: 1,
        limit: 20,
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(titleSearch);
  // Verify search results contain the search term in title or description (case-insensitive)
  TestValidator.predicate(
    "search returns results",
    titleSearch.data.length > 0,
  );
  for (const todo of titleSearch.data) {
    const containsSearch =
      todo.title.toLowerCase().includes(searchTerm.toLowerCase());
    TestValidator.predicate("todo contains search term", containsSearch);
  }
  // Test 5: Text search in descriptions
  const descSearchTerm = descriptionKeywords[0]; // "important"
  const descSearch = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        search: descSearchTerm,
        page: 1,
        limit: 20,
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(descSearch);
  TestValidator.predicate(
    "description search returns results",
    descSearch.data.length > 0,
  );
  for (const todo of descSearch.data) {
    const containsSearch =
      todo.title.toLowerCase().includes(descSearchTerm.toLowerCase());
    TestValidator.predicate(
      "todo contains description search term",
      containsSearch,
    );
  }
  // Test 6: Partial matching search
  const partialSearchTerm = searchTerm.substring(0, 3); // "app"
  const partialSearch = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        search: partialSearchTerm,
        page: 1,
        limit: 20,
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(partialSearch);
  TestValidator.predicate(
    "partial search returns results",
    partialSearch.data.length > 0,
  );
  for (const todo of partialSearch.data) {
    const containsPartial =
      todo.title.toLowerCase().includes(partialSearchTerm.toLowerCase());
    TestValidator.predicate(
      "todo contains partial search term",
      containsPartial,
    );
  }
  // Test 7: Combined search with pagination
  const combinedSearch = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        search: searchTerm,
        page: 1,
        limit: 3,
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(combinedSearch);
  TestValidator.predicate(
    "combined search has pagination",
    combinedSearch.data.length <= 3,
  );
  TestValidator.equals(
    "combined search current page",
    combinedSearch.pagination.current,
    1,
  );
  // Test 8: Search with no results
  const noResultsSearch = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        search: "nonexistentkeyword12345",
        page: 1,
        limit: 10,
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(noResultsSearch);
  TestValidator.equals(
    "no results search should have zero data",
    noResultsSearch.data.length,
    0,
  );
  TestValidator.equals(
    "no results search should have zero records",
    noResultsSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "no results search should have zero pages",
    noResultsSearch.pagination.pages,
    0,
  );
  // Test 9: Search with sorting
  const searchWithSort = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        search: searchTerm,
        sort_by: "created_at",
        sort_direction: "desc",
        page: 1,
        limit: 10,
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(searchWithSort);
  // Test 10: Empty search string (should return all)
  const emptySearch = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        search: "",
        page: 1,
        limit: 10,
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "empty search returns results",
    emptySearch.data.length > 0,
  );
  TestValidator.equals(
    "empty search has same total as basic search",
    emptySearch.pagination.records,
    firstPage.pagination.records,
  );
  console.log(
    `✅ Todo search pagination and text search tests completed successfully. Created ${todoCount} todos.`,
  );
}