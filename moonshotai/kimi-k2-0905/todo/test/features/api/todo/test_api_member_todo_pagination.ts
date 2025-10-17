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
 * Tests paginated retrieval of member's todo items by creating more items than
 * can be returned in a single page, then validating pagination parameters
 * return correct subsets. Focuses on workflow that demonstrates paginated data
 * access patterns rather than testing edge cases around dynamic browsing.
 *
 * This test validates proper pagination functionality by creating a large
 * number of todo items and then testing various pagination scenarios to ensure
 * that pagination parameters work correctly and return the expected subsets of
 * data.
 *
 * Test workflow:
 *
 * 1. Create a new member account
 * 2. Generate multiple todo items (more than default page size of 100)
 * 3. Test basic pagination with default parameters
 * 4. Test pagination with different page sizes
 * 5. Test pagination with different page numbers
 * 6. Validate pagination metadata accuracy
 * 7. Test combined pagination with sorting and filtering
 * 8. Test pagination edge cases
 */
export async function test_api_member_todo_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "member1234",
    } satisfies IMemberCreate.IRequest,
  });
  typia.assert(member);

  // Step 2: Generate multiple todo items (120 items, exceeding default limit of 100)
  const todoTitles = ArrayUtil.repeat(120, (index) => {
    return {
      title: `Todo task #${index + 1} - ${RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 })}`,
      priority: RandomGenerator.pick(["Low", "Medium", "High"] as const),
    };
  });

  // Create todos in batches to avoid potential rate limiting
  for (let i = 0; i < 120; i += 20) {
    const batch = todoTitles.slice(i, i + 20);
    await ArrayUtil.asyncForEach(batch, async (todoData) => {
      await api.functional.todo.member.todos.create(connection, {
        body: todoData satisfies ITodoTodo.ITodoCreate,
      });
    });
  }

  // Step 3: Test basic pagination with default parameters
  const defaultPage = await api.functional.todo.member.todos.index(connection, {
    body: {} satisfies ITodoTodo.IRequest,
  });
  typia.assert(defaultPage);

  TestValidator.equals(
    "default pagination returns first page",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination uses limit of 100",
    defaultPage.pagination.limit,
    100,
  );
  TestValidator.equals(
    "default pagination shows correct records count",
    defaultPage.pagination.records,
    120,
  );
  TestValidator.equals(
    "default pagination shows correct pages count",
    defaultPage.pagination.pages,
    2,
  );
  TestValidator.equals(
    "default pagination returns correct data count",
    defaultPage.data.length,
    100,
  );

  // Step 4: Test pagination with different page sizes
  // Test page size 10
  const pageSize10 = await api.functional.todo.member.todos.index(connection, {
    body: {
      page: 1,
      limit: 10,
    } satisfies ITodoTodo.IRequest,
  });
  typia.assert(pageSize10);

  TestValidator.equals(
    "page size 10 returns 10 items",
    pageSize10.data.length,
    10,
  );
  TestValidator.equals(
    "page size 10 calculates correct pages",
    pageSize10.pagination.pages,
    12,
  );

  // Test page size 50
  const pageSize50 = await api.functional.todo.member.todos.index(connection, {
    body: {
      page: 1,
      limit: 50,
    } satisfies ITodoTodo.IRequest,
  });
  typia.assert(pageSize50);

  TestValidator.equals(
    "page size 50 returns 50 items",
    pageSize50.data.length,
    50,
  );
  TestValidator.equals(
    "page size 50 calculates correct pages",
    pageSize50.pagination.pages,
    3,
  );

  // Step 5: Test pagination with different page numbers
  // Test page 2 with default limit
  const page2 = await api.functional.todo.member.todos.index(connection, {
    body: {
      page: 2,
    } satisfies ITodoTodo.IRequest,
  });
  typia.assert(page2);

  TestValidator.equals("page 2 returns remaining items", page2.data.length, 20);
  TestValidator.equals(
    "page 2 has current page number correct",
    page2.pagination.current,
    2,
  );

  // Test middle page with custom limit
  const middlePage = await api.functional.todo.member.todos.index(connection, {
    body: {
      page: 3,
      limit: 40,
    } satisfies ITodoTodo.IRequest,
  });
  typia.assert(middlePage);

  TestValidator.equals(
    "page 3 with limit 40 returns correct count",
    middlePage.data.length,
    40,
  );
  TestValidator.equals(
    "page 3 with limit 40 shows correct current page",
    middlePage.pagination.current,
    3,
  );

  // Step 6: Validate pagination metadata accuracy
  TestValidator.equals(
    "total records should not change between pages",
    page2.pagination.records,
    120,
  );
  TestValidator.equals(
    "pages count should be consistent",
    page2.pagination.pages,
    2,
  );
  TestValidator.equals(
    "limit should not change between pages",
    page2.pagination.limit,
    100,
  );

  // Step 7: Test combined pagination with sorting and filtering
  // Filter for incomplete todos with pagination
  const incompleteFiltered = await api.functional.todo.member.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 25,
        completed: false,
        sort_by: "priority",
      } satisfies ITodoTodo.IRequest,
    },
  );
  typia.assert(incompleteFiltered);

  TestValidator.predicate(
    "filtered pagination returns incomplete todos",
    incompleteFiltered.data.length <= 100,
  );
  TestValidator.equals(
    "filtered pagination uses requested limit",
    incompleteFiltered.pagination.limit,
    25,
  );
  TestValidator.predicate(
    "filtered pagination maintains total records",
    incompleteFiltered.pagination.records === 120,
  );

  // Search filter with pagination
  const searchFiltered = await api.functional.todo.member.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        search: "Todo task #1",
        sort_by: "title",
      } satisfies ITodoTodo.IRequest,
    },
  );
  typia.assert(searchFiltered);

  TestValidator.predicate(
    "search filtered pagination returns matching items",
    searchFiltered.data.length <= 20,
  );
  TestValidator.predicate(
    "search filtered pagination shows relevant results",
    searchFiltered.data.length > 0,
  );

  // Step 8: Test pagination edge cases
  // Test page beyond available data
  const beyondAvailable = await api.functional.todo.member.todos.index(
    connection,
    {
      body: {
        page: 10,
        limit: 100,
      } satisfies ITodoTodo.IRequest,
    },
  );
  typia.assert(beyondAvailable);

  TestValidator.equals(
    "page beyond available returns empty array",
    beyondAvailable.data.length,
    0,
  );
  TestValidator.equals(
    "page beyond available shows current page",
    beyondAvailable.pagination.current,
    10,
  );
  TestValidator.equals(
    "page beyond available maintains total records",
    beyondAvailable.pagination.records,
    120,
  );

  // Test limit at maximum allowed value
  const maxLimitPage = await api.functional.todo.member.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoTodo.IRequest,
    },
  );
  typia.assert(maxLimitPage);

  TestValidator.predicate(
    "page with max limit returns up to 100 items",
    maxLimitPage.data.length <= 100,
  );
  TestValidator.equals(
    "page with max limit uses requested limit",
    maxLimitPage.pagination.limit,
    100,
  );

  // Step 9: Test pagination with priority filtering
  const highPriorityPage = await api.functional.todo.member.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 15,
        priority: "High",
      } satisfies ITodoTodo.IRequest,
    },
  );
  typia.assert(highPriorityPage);

  TestValidator.predicate(
    "high priority filtered page returns high priority items",
    highPriorityPage.data.length <= 100,
  );
  TestValidator.predicate(
    "all returned items have high priority",
    highPriorityPage.data.every((todo) => todo.priority === "High"),
  );
}
