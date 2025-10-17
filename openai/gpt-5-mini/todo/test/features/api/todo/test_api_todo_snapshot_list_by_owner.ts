import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoSnapshot";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoSnapshot";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validate listing of todo snapshot versions for a todo owned by the current
 * user.
 *
 * This test covers both the happy path where snapshot records already exist and
 * the empty-state behavior where no snapshots have been generated yet. It also
 * validates pagination metadata, server-side pageSize capping behavior, and
 * ordering by snapshot_at descending when snapshots are present.
 *
 * Steps:
 *
 * 1. Create a new user via POST /auth/user/join and let SDK populate connection
 *    headers.
 * 2. Create a todo via POST /todoApp/user/todos for the authenticated user.
 * 3. Call PATCH /todoApp/user/todos/{todoId}/versions with pagination & sorting.
 * 4. Validate response structure, pagination, content, and ordering if items
 *    exist.
 * 5. Negative: request versions for a non-existent (well-formed) UUID and assert
 *    error.
 */
export async function test_api_todo_snapshot_list_by_owner(
  connection: api.IConnection,
) {
  // 1) Create a fresh user (join)
  const joinOutput: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123",
        display_name: RandomGenerator.name(),
      } satisfies ITodoAppUser.ICreate,
    });
  typia.assert(joinOutput);

  // Save user id for debugging / correlation
  const userId: string & tags.Format<"uuid"> = joinOutput.id;

  // 2) Create a todo for that user
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    position: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    is_completed: false,
  } satisfies ITodoAppTodo.ICreate;

  const todo: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    { body: createBody },
  );
  typia.assert(todo);

  // 3) Prepare versions request (pagination + sorting)
  const requestBody = {
    page: 1,
    pageSize: 5,
    sortBy: "snapshot_at",
    sortOrder: "desc",
    // todoId is passed as path param below; body.todoId is optional
  } satisfies ITodoAppTodoSnapshot.IRequest;

  // Helper: attempt to fetch snapshots with conservative polling (0..2 retries)
  async function fetchSnapshots(): Promise<IPageITodoAppTodoSnapshot> {
    const maxAttempts = 3;
    const delayMs = 500;
    for (let attempt = 1; attempt <= maxAttempts; ++attempt) {
      const page = await api.functional.todoApp.user.todos.versions.index(
        connection,
        {
          todoId: todo.id,
          body: requestBody,
        },
      );
      typia.assert(page);
      // If items exist, return immediately. Otherwise, allow a few retries to
      // give background snapshot generators time to produce snapshots.
      if (page.data.length > 0 || attempt === maxAttempts) return page;
      // small delay
      await new Promise((res) => setTimeout(res, delayMs));
    }
    // unreachable but TypeScript needs a return
    return await api.functional.todoApp.user.todos.versions.index(connection, {
      todoId: todo.id,
      body: requestBody,
    });
  }

  const pageResult: IPageITodoAppTodoSnapshot = await fetchSnapshots();
  typia.assert(pageResult);

  // 4) Validate pagination metadata and items
  const pagination = pageResult.pagination;
  const items = pageResult.data;

  // pageSize / limit behavior: server may cap the requested pageSize
  TestValidator.predicate(
    "pagination.limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.current matches request page",
    pagination.current === (requestBody.page ?? 1),
  );
  TestValidator.predicate(
    "server limit does not exceed requested pageSize",
    pagination.limit <= (requestBody.pageSize ?? pagination.limit),
  );

  // total/records consistency
  TestValidator.predicate(
    "pagination.records is >= returned items length",
    pagination.records >= items.length,
  );
  TestValidator.predicate("pages is non-negative", pagination.pages >= 0);

  // Items: either empty (no snapshots) or contain snapshot summaries
  if (items.length === 0) {
    // Empty-state assertions
    TestValidator.equals(
      "empty snapshots returns zero records",
      pagination.records,
      0,
    );
    TestValidator.equals("empty snapshots returns empty data array", items, []);
  } else {
    // If items exist, ensure each snapshot references the created todo and
    // snapshot_at ordering is desc when requested.
    for (const it of items) {
      TestValidator.equals(
        "snapshot references same todo id",
        it.todo_app_todo_id,
        todo.id,
      );
      // typia.assert already ensures id and snapshot_at formats are correct.
      typia.assert<ITodoAppTodoSnapshot>(it);
    }

    // Ensure ordering by snapshot_at desc
    if (items.length >= 2) {
      const first = new Date(items[0].snapshot_at).getTime();
      const last = new Date(items[items.length - 1].snapshot_at).getTime();
      TestValidator.predicate(
        "snapshots ordered by snapshot_at desc",
        first >= last,
      );
    }
  }

  // 5) Negative case: requesting snapshots for a well-formed but non-existent todo
  const fakeTodoId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "requesting snapshots for non-existent todo should throw",
    async () => {
      await api.functional.todoApp.user.todos.versions.index(connection, {
        todoId: fakeTodoId,
        body: requestBody,
      });
    },
  );
}
