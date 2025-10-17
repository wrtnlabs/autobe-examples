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
 * Validate todo listing behavior: filters, sorting and pagination.
 *
 * Scenario summary:
 *
 * 1. Register a new user via POST /auth/user/join (SDK: auth.user.join).
 * 2. Create multiple todos via POST /todoApp/user/todos with varying is_completed
 *    values and positions to exercise list behavior.
 * 3. Call PATCH /todoApp/user/todos with no filters to verify default sorting
 *    (created_at desc) and presence of created items.
 * 4. Call with filter isCompleted=true to ensure only completed items are
 *    returned.
 * 5. Call with sortBy=position and sortOrder to validate ordering by position
 *    ascending/descending.
 * 6. Validate pagination metadata when page/pageSize provided.
 */
export async function test_api_todo_list_filters_and_sorting(
  connection: api.IConnection,
) {
  // 1) Register user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123",
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppUser.ICreate;

  const auth: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert(auth);

  // 2) Create todos with varied completion and position
  const created: ITodoAppTodo[] = [];

  // Helper to create a todo and push to created[]
  async function createTodo(body: ITodoAppTodo.ICreate): Promise<void> {
    const todo: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
      connection,
      { body },
    );
    typia.assert(todo);
    created.push(todo);
  }

  // Create 4 todos: positions 1, 2, 3, and one without position
  await createTodo({
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    position: 1,
    is_completed: false,
  } satisfies ITodoAppTodo.ICreate);

  await createTodo({
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    position: 2,
    is_completed: true, // a completed todo
  } satisfies ITodoAppTodo.ICreate);

  await createTodo({
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    position: 3,
    is_completed: false,
  } satisfies ITodoAppTodo.ICreate);

  await createTodo({
    title: RandomGenerator.paragraph({ sentences: 2 }),
    // no position provided (undefined)
    is_completed: false,
  } satisfies ITodoAppTodo.ICreate);

  // At this point we have 4 created todos
  const createdIds = created.map((t) => t.id);

  // 3) Default list (no filters) - expect to include created todos
  const defaultPage: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {} satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(defaultPage);

  // Assert that each created id appears in the returned data (presence check)
  TestValidator.predicate(
    "list contains all newly created todo ids",
    createdIds.every((id) => defaultPage.data.some((d) => d.id === id)),
  );

  // Assert ordering by created_at is non-increasing (newest first)
  (function assertCreatedAtDescending() {
    const timestamps = defaultPage.data.map((d) =>
      new Date(d.created_at).getTime(),
    );
    let ok = true;
    for (let i = 1; i < timestamps.length; ++i) {
      if (timestamps[i] > timestamps[i - 1]) {
        ok = false;
        break;
      }
    }
    TestValidator.predicate(
      "default list is ordered by created_at descending",
      ok,
    );
  })();

  // 4) Filter isCompleted = true
  const completedPage: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: { isCompleted: true } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(completedPage);

  // All returned items must have is_completed === true
  TestValidator.predicate(
    "filter isCompleted=true returns only completed items",
    completedPage.data.every((d) => d.is_completed === true),
  );

  // The known completed todo id must be present
  const knownCompletedId = created.find((t) => t.is_completed === true)!.id;
  TestValidator.predicate(
    "completed list contains known completed todo",
    completedPage.data.some((d) => d.id === knownCompletedId),
  );

  // 5) Sort by position ascending
  const byPositionAsc: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        sortBy: "position",
        sortOrder: "asc",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(byPositionAsc);

  // Extract positions (treat undefined/null as Number.POSITIVE_INFINITY so
  // that items without position sort to the end when ascending)
  const positionsAsc = byPositionAsc.data.map((d) =>
    d.position === null || d.position === undefined
      ? Number.POSITIVE_INFINITY
      : d.position,
  );
  TestValidator.predicate(
    "positions are sorted ascending when sortBy=position & sortOrder=asc",
    positionsAsc.every((v, i, arr) => i === 0 || arr[i - 1] <= v),
  );

  // Sort by position descending
  const byPositionDesc: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        sortBy: "position",
        sortOrder: "desc",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(byPositionDesc);

  const positionsDesc = byPositionDesc.data.map((d) =>
    d.position === null || d.position === undefined
      ? Number.NEGATIVE_INFINITY
      : d.position,
  );
  TestValidator.predicate(
    "positions are sorted descending when sortBy=position & sortOrder=desc",
    positionsDesc.every((v, i, arr) => i === 0 || arr[i - 1] >= v),
  );

  // 6) Pagination: page 1 with pageSize 2
  const paged: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: { page: 1, pageSize: 2 } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(paged);

  TestValidator.equals("pagination current is 1", paged.pagination.current, 1);
  TestValidator.equals(
    "pagination limit is pageSize (2)",
    paged.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "page data length does not exceed pageSize",
    paged.data.length <= 2,
  );
}
