import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IESortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortOrder";
import type { IETodoStatusFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoStatusFilter";
import type { IETodoTodoSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoTodoSortBy";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoTodo";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

export async function test_api_todo_list_default_pagination_ordering(
  connection: api.IConnection,
) {
  /**
   * Validate default pagination and ordering for personal todo listing.
   *
   * Flow:
   *
   * 1. Create a NEW user context via POST /auth/user/join
   * 2. Using this user, create 25 todos via POST /todo/user/todos with sequential
   *    titles
   * 3. Call PATCH /todo/user/todos with empty body to use defaults (page=1,
   *    pageSize=20, sort created_at desc)
   * 4. Verify first page contains 20 newest items (Todo 25..Todo 06) and
   *    pagination shows multiple pages
   * 5. Request page=2 and verify remaining 5 items (Todo 05..Todo 01) are returned
   *    with same ordering semantics
   */

  // 1) Register and authenticate a new user (token auto-managed by SDK)
  const authorized = await api.functional.auth.user.join(connection, {
    body: typia.random<ITodoUser.IJoin>(),
  });
  typia.assert(authorized);

  // Helper for deterministic titles and ensuring unique created_at ordering
  const pad = (n: number) => n.toString().padStart(2, "0");

  // 2) Create 25 todos with sequential titles to ensure distinct creation order
  for (let i = 1; i <= 25; i++) {
    const title = `Todo ${pad(i)}`;
    const created = await api.functional.todo.user.todos.create(connection, {
      body: {
        title,
      } satisfies ITodoTodo.ICreate,
    });
    typia.assert(created);
    // tiny delay to make created_at strictly increasing
    await new Promise((resolve) => setTimeout(resolve, 2));
  }

  // Precompute expected title sequences for validation
  const expectedFirstPageTitles: string[] = Array.from(
    { length: 20 },
    (_, idx) => {
      const number = 25 - idx; // 25..6
      return `Todo ${pad(number)}`;
    },
  );
  const expectedSecondPageTitles: string[] = Array.from(
    { length: 5 },
    (_, idx) => {
      const number = 5 - idx; // 5..1
      return `Todo ${pad(number)}`;
    },
  );

  // 3) List with defaults (empty body) -> expect page 1, limit 20, order by created_at desc
  const first = await api.functional.todo.user.todos.index(connection, {
    body: {} satisfies ITodoTodo.IRequest,
  });
  typia.assert(first);

  // Validate pagination metadata
  TestValidator.equals("default page is 1", first.pagination.current, 1);
  TestValidator.equals("default pageSize is 20", first.pagination.limit, 20);
  TestValidator.predicate(
    "multiple pages should exist (25 items with pageSize=20)",
    first.pagination.pages >= 2,
  );
  TestValidator.equals(
    "total records should be 25",
    first.pagination.records,
    25,
  );

  // Validate first page contents
  TestValidator.equals(
    "first page should contain 20 items",
    first.data.length,
    20,
  );

  const firstTitles = first.data.map((t) => t.title);
  TestValidator.equals(
    "first page titles should be newest first (Todo 25..Todo 06)",
    firstTitles,
    expectedFirstPageTitles,
  );

  // Ownership scoping: all items must belong to the authenticated user
  TestValidator.predicate(
    "first page items should be owned by authenticated user",
    first.data.every((t) => t.owner.id === authorized.id),
  );

  // 4) Request page=2 and validate remaining items
  const second = await api.functional.todo.user.todos.index(connection, {
    body: {
      page: 2,
    } satisfies ITodoTodo.IRequest,
  });
  typia.assert(second);

  TestValidator.equals(
    "second page should contain remaining 5 items",
    second.data.length,
    5,
  );

  const secondTitles = second.data.map((t) => t.title);
  TestValidator.equals(
    "second page titles should be Todo 05..Todo 01 (descending)",
    secondTitles,
    expectedSecondPageTitles,
  );

  TestValidator.predicate(
    "second page items should be owned by authenticated user",
    second.data.every((t) => t.owner.id === authorized.id),
  );
}
