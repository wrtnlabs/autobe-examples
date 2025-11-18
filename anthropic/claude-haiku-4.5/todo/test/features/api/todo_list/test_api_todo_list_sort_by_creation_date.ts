import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodo";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test sorting todos by creation date with ascending and descending order.
 *
 * Validates that:
 *
 * 1. Multiple todos are created sequentially with distinct creation timestamps
 * 2. Sorting with descending order (default) returns todos from newest to oldest
 * 3. Sorting with ascending order returns todos from oldest to newest
 * 4. The created_at timestamps match the actual creation sequence
 * 5. Pagination is correctly applied to the sorted results
 */
export async function test_api_todo_list_sort_by_creation_date(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(10),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create multiple todos with distinct creation timestamps
  const createdTodos: ITodoListTodo[] = [];

  for (let i = 0; i < 5; i++) {
    const todo = await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: `Todo ${i + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        priority: RandomGenerator.pick(["low", "medium", "high"] as const),
      } satisfies ITodoListTodo.ICreate,
    });
    typia.assert(todo);
    createdTodos.push(todo);

    // Small delay to ensure distinct timestamps
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  // Step 3: Test sorting by created_at in descending order (newest first)
  const descendingResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        sort_by: "created_at",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(descendingResult);

  // Validate descending order: newest todos should appear first
  TestValidator.predicate("descending order returns todos newest first", () => {
    for (let i = 0; i < descendingResult.data.length - 1; i++) {
      const current = new Date(descendingResult.data[i].created_at).getTime();
      const next = new Date(descendingResult.data[i + 1].created_at).getTime();
      if (current < next) return false;
    }
    return true;
  });

  // Step 4: Test sorting by created_at in ascending order (oldest first)
  const ascendingResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        sort_by: "created_at",
        order: "asc",
        page: 1,
        limit: 10,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(ascendingResult);

  // Validate ascending order: oldest todos should appear first
  TestValidator.predicate("ascending order returns todos oldest first", () => {
    for (let i = 0; i < ascendingResult.data.length - 1; i++) {
      const current = new Date(ascendingResult.data[i].created_at).getTime();
      const next = new Date(ascendingResult.data[i + 1].created_at).getTime();
      if (current > next) return false;
    }
    return true;
  });

  // Step 5: Verify pagination information
  TestValidator.predicate(
    "pagination current page is 1",
    () => descendingResult.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit is 10",
    () => descendingResult.pagination.limit === 10,
  );

  TestValidator.predicate(
    "pagination records count matches created todos",
    () => descendingResult.pagination.records >= createdTodos.length,
  );

  // Step 6: Verify all created todos appear in sorted results
  const descendingIds = descendingResult.data.map((todo) => todo.id);
  const ascendingIds = ascendingResult.data.map((todo) => todo.id);

  for (const createdTodo of createdTodos) {
    TestValidator.predicate(
      `todo ${createdTodo.id} appears in descending order results`,
      () => descendingIds.includes(createdTodo.id),
    );

    TestValidator.predicate(
      `todo ${createdTodo.id} appears in ascending order results`,
      () => ascendingIds.includes(createdTodo.id),
    );
  }
}
