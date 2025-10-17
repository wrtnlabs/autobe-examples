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
 * Validate listing todos filtered by completion state and sorted by position.
 *
 * Steps:
 *
 * 1. Register a fresh user (auth.user.join) and let SDK populate Authorization
 *    header.
 * 2. Create multiple todos with deterministic positions and mixed completion
 *    flags.
 * 3. Call index (PATCH /todoApp/user/todos) with isCompleted=true and
 *    sortBy=position, sortOrder=asc.
 * 4. Validate that: all returned items are completed, they are ordered by position
 *    ascending, and the returned set matches the created completed todos.
 */
export async function test_api_todo_list_filter_iscompleted_and_sort_by_position(
  connection: api.IConnection,
) {
  // 1) Register a fresh user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const password = "Password123"; // satisfies min length 8

  const auth: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password,
        display_name: RandomGenerator.name(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(auth);

  // 2) Create multiple todos with explicit positions and mixed completion states
  const createBodies = [
    {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: "completed first",
      position: 1,
      is_completed: true,
    },
    {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: "not completed",
      position: 2,
      is_completed: false,
    },
    {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: "completed second",
      position: 3,
      is_completed: true,
    },
    {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: "not completed second",
      position: 4,
      is_completed: false,
    },
  ] as const;

  const created: ITodoAppTodo[] = [];
  for (const body of createBodies) {
    const todo: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
      connection,
      {
        body: {
          title: body.title,
          description: body.description,
          position: body.position,
          is_completed: body.is_completed,
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    created.push(todo);
  }

  // Collect completed todos we just created for expected set
  const expectedCompleted = created.filter((t) => t.is_completed === true);

  // 3) Call the index endpoint with filter isCompleted=true and sortBy=position ascending
  const page: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        isCompleted: true,
        sortBy: "position",
        sortOrder: "asc",
        page: 1,
        pageSize: 50,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(page);

  // 4) Validations
  // 4.1 All returned items must have is_completed === true
  TestValidator.predicate(
    "all returned todos are completed",
    page.data.every((d) => d.is_completed === true),
  );

  // 4.2 Returned items are ordered by position ascending
  const positions = page.data.map((d) =>
    d.position === null || d.position === undefined
      ? Number.POSITIVE_INFINITY
      : d.position,
  );
  const isAscending = positions.every(
    (v, i, arr) => i === 0 || arr[i - 1] <= v,
  );
  TestValidator.predicate(
    "returned todos are ordered by position ascending",
    isAscending,
  );

  // 4.3 The returned set matches the created completed todos (IDs match and counts equal)
  const returnedIds = page.data.map((d) => d.id);
  const expectedIds = expectedCompleted.map((t) => t.id);

  TestValidator.equals(
    "count of returned completed todos matches created completed todos",
    page.data.length,
    expectedCompleted.length,
  );

  // Because index may be influenced by other data in non-isolated env, ensure that every expected completed id is present in returned ids
  TestValidator.predicate(
    "all expected completed todo ids are present in the returned page",
    expectedIds.every((id) => returnedIds.includes(id)),
  );
}
