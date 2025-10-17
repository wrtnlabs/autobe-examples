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
 * Validate paginated todo listing sorts by createdAt by default (ascending).
 *
 * Business context:
 *
 * - Register a fresh user (obtain authorization token from join endpoint)
 * - Create three todos for that user with distinct titles
 * - Request paginated list (page=1,pageSize=10) via PATCH /todoApp/user/todos
 * - Assert the paginated response includes metadata and items sorted by
 *   created_at ascending
 *
 * Steps:
 *
 * 1. Register user via api.functional.auth.user.join(connection, { body })
 * 2. Create three todos via api.functional.todoApp.user.todos.create(connection, {
 *    body })
 * 3. Call api.functional.todoApp.user.todos.index(connection, { body: { page:1,
 *    pageSize:10 } })
 * 4. Typia.assert() on responses and perform business assertions with
 *    TestValidator
 */
export async function test_api_todo_list_pagination_and_default_sort_by_createdat(
  connection: api.IConnection,
) {
  // 1) Register a fresh user to isolate test data
  const userBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd1",
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppUser.ICreate;

  const authorized: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userBody });
  typia.assert(authorized);

  // 2) Create three todos with distinct titles
  const todoBodies = ArrayUtil.repeat(3, (i) => {
    const base = {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 6 }),
    };
    // For the second item, add an explicit position to exercise position sorting field
    return (
      i === 1
        ? {
            ...base,
            position: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
          }
        : base
    ) satisfies ITodoAppTodo.ICreate;
  });

  const createdTodos: ITodoAppTodo[] = [];
  for (const body of todoBodies) {
    const created: ITodoAppTodo =
      await api.functional.todoApp.user.todos.create(connection, { body });
    typia.assert(created);
    createdTodos.push(created);
    // Small pause is not necessary but could help ordering determinism in some infra
  }

  // 3) Request paginated list (page 1, pageSize 10)
  const requestBody = { page: 1, pageSize: 10 } satisfies ITodoAppTodo.IRequest;
  const page: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: requestBody,
    });
  typia.assert(page);

  // 4) Business validations
  // - Pagination metadata exists and current page is 1
  TestValidator.equals("pagination current is 1", page.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit is >= returned items length",
    page.pagination.limit >= page.data.length,
  );
  TestValidator.predicate(
    "pagination pages is at least 1",
    page.pagination.pages >= 1,
  );

  // - All created todo ids are present in the returned data (by id)
  const returnedIds = page.data.map((s) => s.id);
  const missing = createdTodos.filter((t) => !returnedIds.includes(t.id));
  TestValidator.predicate(
    "all created todos are included in listing",
    missing.length === 0,
  );

  // - Items are sorted by created_at ascending (server default)
  const parsedTimes = page.data.map((s) => Date.parse(s.created_at));
  const isAscending = parsedTimes.every(
    (t, i, arr) => i === 0 || arr[i - 1] <= t,
  );
  TestValidator.predicate(
    "items are sorted by created_at ascending",
    isAscending,
  );

  // - Each returned summary includes expected fields and typia.assert already validated types
  // Additional business predicates: is_completed is boolean for each item
  TestValidator.predicate(
    "each item has is_completed boolean",
    page.data.every((s) => typeof s.is_completed === "boolean"),
  );

  // - At least the item we created with position has that position reflected in the summary when present
  const createdWithPosition = createdTodos.find(
    (t) => t.position !== undefined && t.position !== null,
  );
  if (createdWithPosition) {
    const found = page.data.find((s) => s.id === createdWithPosition.id);
    TestValidator.predicate(
      "created item with position appears with same id",
      found !== undefined,
    );
    if (found) {
      TestValidator.predicate(
        "position when provided is a number or null",
        found.position === null || typeof found.position === "number",
      );
    }
  }
}
