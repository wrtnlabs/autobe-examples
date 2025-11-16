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
 * Validates todo list sorting by creation date functionality.
 *
 * Tests that the todo list API correctly sorts todos by their creation date in
 * both ascending (oldest first) and descending (newest first) order. This test
 * ensures users can retrieve their todos in chronological order for efficient
 * task management and review.
 *
 * Test workflow:
 *
 * 1. Create a new user account for testing
 * 2. Create multiple todos with sequential timestamps
 * 3. Retrieve todos sorted by created_at in ascending order
 * 4. Validate that todos appear oldest-first
 * 5. Retrieve todos sorted by created_at in descending order
 * 6. Validate that todos appear newest-first
 * 7. Verify that sorting is consistent and accurate
 */
export async function test_api_todo_list_sorting_by_creation_date(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create multiple todos with small delays to ensure different timestamps
  const todos: ITodoAppTodo[] = [];
  for (let i = 0; i < 5; i++) {
    const todo = await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: `Todo ${i + 1}`,
        description: `Task number ${i + 1}`,
      } satisfies ITodoAppTodo.ICreate,
    });
    typia.assert(todo);
    todos.push(todo);
    // Small delay to ensure todos have different creation timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  // Step 3: Retrieve todos sorted in ascending order (oldest first)
  const ascendingResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        sort_by: "created_at",
        order: "asc",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(ascendingResult);

  // Step 4: Validate ascending order - oldest todos first
  TestValidator.predicate(
    "ascending order has all created todos",
    ascendingResult.data.length >= 5,
  );

  for (let i = 0; i < ascendingResult.data.length - 1; i++) {
    const current = new Date(ascendingResult.data[i].created_at).getTime();
    const next = new Date(ascendingResult.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `ascending order: todo ${i} created_at <= todo ${i + 1} created_at`,
      current <= next,
    );
  }

  // Step 5: Retrieve todos sorted in descending order (newest first)
  const descendingResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        sort_by: "created_at",
        order: "desc",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(descendingResult);

  // Step 6: Validate descending order - newest todos first
  TestValidator.predicate(
    "descending order has all created todos",
    descendingResult.data.length >= 5,
  );

  for (let i = 0; i < descendingResult.data.length - 1; i++) {
    const current = new Date(descendingResult.data[i].created_at).getTime();
    const next = new Date(descendingResult.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `descending order: todo ${i} created_at >= todo ${i + 1} created_at`,
      current >= next,
    );
  }

  // Step 7: Verify sorting consistency - ascending and descending are inverses
  TestValidator.equals(
    "ascending and descending have same total count",
    ascendingResult.data.length,
    descendingResult.data.length,
  );

  // Verify that first item in ascending matches last item in descending
  TestValidator.equals(
    "first ascending todo matches last descending todo",
    ascendingResult.data[0].id,
    descendingResult.data[descendingResult.data.length - 1].id,
  );

  // Verify that last item in ascending matches first item in descending
  TestValidator.equals(
    "last ascending todo matches first descending todo",
    ascendingResult.data[ascendingResult.data.length - 1].id,
    descendingResult.data[0].id,
  );
}
