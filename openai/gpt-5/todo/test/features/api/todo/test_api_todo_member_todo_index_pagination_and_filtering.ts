import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IETodoListTodoStatusFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoListTodoStatusFilter";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodo";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";
import type { ITodoListTodoMemberJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberJoin";

export async function test_api_todo_member_todo_index_pagination_and_filtering(
  connection: api.IConnection,
) {
  /**
   * Validate member Todo pagination and status filtering.
   *
   * Steps
   *
   * 1. Join as a new todoMember to obtain an authenticated session
   * 2. Seed 23 Todos
   * 3. Toggle a deterministic subset to completed, and revert a subset back to
   *    active
   * 4. Validate status filters: all, active, completed
   * 5. Validate pagination metadata and out-of-range page returns empty data
   * 6. Optionally check first page is broadly newest-first
   */
  // 1) Join as todoMember (auth context handled by SDK)
  const auth = await api.functional.auth.todoMember.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
    } satisfies ITodoListTodoMemberJoin.ICreate,
  });
  typia.assert(auth);

  // 2) Seed Todos
  const TOTAL = 23;
  const created: ITodoListTodo[] = [];
  const createdAtMap = new Map<string, string>();
  for (let i = 0; i < TOTAL; ++i) {
    const todo = await api.functional.todoList.todos.create(connection, {
      body: typia.random<ITodoListTodo.ICreate>(),
    });
    typia.assert(todo);
    created.push(todo);
    createdAtMap.set(todo.id, todo.createdAt);
  }

  // 3) Toggle completion states deterministically
  const finalCompletedIds: string[] = [];
  const finalActiveIds: string[] = [];
  for (let i = 0; i < created.length; ++i) {
    const original = created[i];
    const originalCreatedAt = createdAtMap.get(original.id)!;
    let current = original;

    // If index is even → complete it
    if (i % 2 === 0) {
      const completed = await api.functional.todoList.todos.update(connection, {
        todoId: current.id,
        body: {
          is_completed: true,
        } satisfies ITodoListTodo.IUpdate,
      });
      typia.assert(completed);

      // createdAt must remain unchanged
      TestValidator.equals(
        "createdAt remains unchanged after completion",
        completed.createdAt,
        originalCreatedAt,
      );
      // completed state & completedAt presence
      TestValidator.predicate(
        "isCompleted=true leads to non-null completedAt",
        completed.isCompleted === true &&
          completed.completedAt !== null &&
          completed.completedAt !== undefined,
      );
      // updatedAt >= createdAt
      TestValidator.predicate(
        "updatedAt is >= createdAt when completing",
        new Date(completed.updatedAt).getTime() >=
          new Date(originalCreatedAt).getTime(),
      );
      current = completed;

      // If divisible by 4 → revert back to active (false)
      if (i % 4 === 0) {
        const reverted = await api.functional.todoList.todos.update(
          connection,
          {
            todoId: current.id,
            body: {
              is_completed: false,
            } satisfies ITodoListTodo.IUpdate,
          },
        );
        typia.assert(reverted);
        // createdAt unchanged again
        TestValidator.equals(
          "createdAt remains unchanged after revert",
          reverted.createdAt,
          originalCreatedAt,
        );
        // completedAt cleared
        TestValidator.predicate(
          "revert to active clears completedAt",
          reverted.isCompleted === false &&
            (reverted.completedAt === null ||
              reverted.completedAt === undefined),
        );
        // updatedAt monotonic (>= prior)
        TestValidator.predicate(
          "updatedAt increases or equals when reverting",
          new Date(reverted.updatedAt).getTime() >=
            new Date(current.updatedAt).getTime(),
        );
        current = reverted;
      }
    }

    // Record final state groups
    if (current.isCompleted) finalCompletedIds.push(current.id);
    else finalActiveIds.push(current.id);
  }

  // Derived expected sets
  const createdIds = created.map((t) => t.id);
  const sortIds = (arr: string[]) => [...arr].sort();

  // 4) Validate filters: all/active/completed
  const listAll = await api.functional.todoList.todoMember.todos.index(
    connection,
    {
      body: {
        page: 1 satisfies number as number,
        limit: 50 satisfies number as number,
        status: "all",
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(listAll);
  const allIds = listAll.data.map((s) => s.id);

  TestValidator.equals(
    "all-list IDs equal created IDs (order-insensitive)",
    sortIds(allIds),
    sortIds(createdIds),
  );
  TestValidator.equals(
    "partition sizes add up",
    allIds.length,
    finalActiveIds.length + finalCompletedIds.length,
  );

  const listCompleted = await api.functional.todoList.todoMember.todos.index(
    connection,
    {
      body: {
        page: 1 satisfies number as number,
        limit: 50 satisfies number as number,
        status: "completed",
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(listCompleted);
  const completedIds = listCompleted.data.map((s) => s.id);
  TestValidator.equals(
    "completed filter returns exactly completed IDs",
    sortIds(completedIds),
    sortIds(finalCompletedIds),
  );

  const listActive = await api.functional.todoList.todoMember.todos.index(
    connection,
    {
      body: {
        page: 1 satisfies number as number,
        limit: 50 satisfies number as number,
        status: "active",
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(listActive);
  const activeIds = listActive.data.map((s) => s.id);
  TestValidator.equals(
    "active filter returns exactly active IDs",
    sortIds(activeIds),
    sortIds(finalActiveIds),
  );

  // 5) Pagination behavior with limit=10
  const ten = 10 satisfies number as number;
  const page1 = await api.functional.todoList.todoMember.todos.index(
    connection,
    {
      body: {
        page: 1 satisfies number as number,
        limit: ten,
        status: "all",
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals(
    "records equals number of created items for this member",
    page1.pagination.records,
    created.length,
  );
  const beyond = (page1.pagination.pages + 1) satisfies number as number;
  const pageBeyond = await api.functional.todoList.todoMember.todos.index(
    connection,
    {
      body: {
        page: beyond,
        limit: ten,
        status: "all",
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(pageBeyond);
  TestValidator.equals(
    "beyond-last page returns empty data",
    pageBeyond.data.length,
    0,
  );
  TestValidator.equals(
    "beyond-last page number echoed",
    pageBeyond.pagination.current,
    beyond,
  );
  TestValidator.equals(
    "beyond-last pages metadata unchanged",
    pageBeyond.pagination.pages,
    page1.pagination.pages,
  );

  // 6) Broad newest-first check on first page (no strict ordering assumptions)
  const times = page1.data.map((s) => new Date(s.createdAt).getTime());
  const nonIncreasing = times.every((t, idx) =>
    idx === 0 ? true : times[idx - 1] >= t,
  );
  TestValidator.predicate(
    "first page roughly newest-first by createdAt desc",
    nonIncreasing,
  );
}
