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
import type { ITodoTodoCompletion } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodoCompletion";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validate status filtering for personal todos (active, completed, all).
 *
 * Business context:
 *
 * - A newly joined user creates 6 todos.
 * - Half are marked completed via the specialized completion endpoint.
 * - Listing with status filter must return subsets by the completed boolean,
 *   scoped to the authenticated user only.
 *
 * Steps:
 *
 * 1. Join as a new user (POST /auth/user/join)
 * 2. Create 6 todos (POST /todo/user/todos)
 * 3. Mark first 3 as completed (PUT /todo/user/todos/{todoId}/completion)
 * 4. List with status=active, completed, all (PATCH /todo/user/todos)
 * 5. Validate ownership, counts, and semantics for each list
 */
export async function test_api_todo_list_status_filter_active_and_completed(
  connection: api.IConnection,
) {
  // 1) Join as a new user
  const auth = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string &
          tags.MinLength<8> &
          tags.Pattern<"^(?=.*[A-Za-z])(?=.*\\d).{8,}$"> &
          tags.Format<"password">
      >(),
      href: typia.random<string & tags.MaxLength<80000> & tags.Format<"uri">>(),
      referrer: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<80000> & tags.Format<"uri">
      >(),
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(auth);

  // 2) Create a mix of todos (6 items)
  const createdTodos: ITodoTodo[] = await ArrayUtil.asyncRepeat(6, async () => {
    const created = await api.functional.todo.user.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 3,
          wordMax: 8,
        }),
        description: null,
      } satisfies ITodoTodo.ICreate,
    });
    typia.assert(created);
    return created;
  });

  // Partition for completion updates
  const toComplete: ITodoTodo[] = createdTodos.slice(0, 3);
  const toRemainActive: ITodoTodo[] = createdTodos.slice(3);

  // 3) Mark half as completed=true
  await ArrayUtil.asyncForEach(toComplete, async (todo) => {
    const updated =
      await api.functional.todo.user.todos.completion.updateCompletion(
        connection,
        {
          todoId: todo.id,
          body: { completed: true } satisfies ITodoTodoCompletion.IUpdate,
        },
      );
    typia.assert(updated);
    TestValidator.equals(
      "todo is marked as completed",
      updated.completed,
      true,
    );
  });

  // Helper to sort UUIDs lexicographically for set-equality comparison
  const sortIds = (ids: string[]) => [...ids].sort();

  // Expected ID sets
  const expectedActiveIds = sortIds(toRemainActive.map((t) => t.id));
  const expectedCompletedIds = sortIds(toComplete.map((t) => t.id));
  const expectedAllIds = sortIds(createdTodos.map((t) => t.id));

  // 4a) List active: completed=false
  const pageActive = await api.functional.todo.user.todos.index(connection, {
    body: { status: "active" } satisfies ITodoTodo.IRequest,
  });
  typia.assert(pageActive);

  const activeIds = sortIds(pageActive.data.map((s) => s.id));
  TestValidator.equals(
    "active filter returns expected ids",
    activeIds,
    expectedActiveIds,
  );
  TestValidator.equals(
    "active list count matches expected",
    pageActive.data.length,
    expectedActiveIds.length,
  );
  TestValidator.predicate(
    "all active items are not completed",
    pageActive.data.every((s) => s.completed === false),
  );
  TestValidator.predicate(
    "all active items belong to caller",
    pageActive.data.every((s) => s.owner.id === auth.id),
  );

  // 4b) List completed: completed=true
  const pageCompleted = await api.functional.todo.user.todos.index(connection, {
    body: { status: "completed" } satisfies ITodoTodo.IRequest,
  });
  typia.assert(pageCompleted);

  const completedIds = sortIds(pageCompleted.data.map((s) => s.id));
  TestValidator.equals(
    "completed filter returns expected ids",
    completedIds,
    expectedCompletedIds,
  );
  TestValidator.equals(
    "completed list count matches expected",
    pageCompleted.data.length,
    expectedCompletedIds.length,
  );
  TestValidator.predicate(
    "all completed items are completed",
    pageCompleted.data.every((s) => s.completed === true),
  );
  TestValidator.predicate(
    "all completed items belong to caller",
    pageCompleted.data.every((s) => s.owner.id === auth.id),
  );

  // 4c) List all: both states
  const pageAll = await api.functional.todo.user.todos.index(connection, {
    body: { status: "all" } satisfies ITodoTodo.IRequest,
  });
  typia.assert(pageAll);

  const allIds = sortIds(pageAll.data.map((s) => s.id));
  TestValidator.equals(
    "all filter returns expected ids",
    allIds,
    expectedAllIds,
  );
  TestValidator.equals(
    "all list count matches expected",
    pageAll.data.length,
    expectedAllIds.length,
  );
  TestValidator.predicate(
    "all items belong to caller",
    pageAll.data.every((s) => s.owner.id === auth.id),
  );
}
