import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoTodo";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * End-to-end test for paginated todo list retrieval with advanced filters for a
 * newly registered user. Verifies that no data is present, privacy is
 * maintained (no other users' todos are visible), and all filter/sort/paging
 * options are handled.
 */
export async function test_api_todo_list_retrieval_with_filters(
  connection: api.IConnection,
) {
  // 1. Register two users to check privacy and empty list enforcement
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user2Email = typia.random<string & tags.Format<"email">>();
  const sessionContext = {
    ip: null,
    href: "https://app.todo.test/register",
    referrer: "https://app.todo.test/login",
  };
  const user1 = await api.functional.auth.user.join(connection, {
    body: {
      email: user1Email,
      password: "pw1234!@#",
      ...sessionContext,
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(user1);
  // Switch context to user2, ensure their data is isolated
  await api.functional.auth.user.join(connection, {
    body: {
      email: user2Email,
      password: "pw1234!@#",
      ...sessionContext,
    } satisfies ITodoUser.IJoin,
  });
  // Switch back to user1 (for subsequent todos list queries)
  await api.functional.auth.user.join(connection, {
    body: {
      email: user1Email,
      password: "pw1234!@#",
      ...sessionContext,
    } satisfies ITodoUser.IJoin,
  });

  // 2. Define basic filter/sort/pagination option sets to test for coverage
  const baseReq = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies ITodoTodo.IRequest;
  const filterCases: ITodoTodo.IRequest[] = [
    baseReq,
    { ...baseReq, q: "" },
    { ...baseReq, completed: false },
    { ...baseReq, completed: true },
    { ...baseReq, created_from: null },
    { ...baseReq, created_to: null },
    { ...baseReq, completed_from: null },
    { ...baseReq, completed_to: null },
    { ...baseReq, sort_by: "created_at" },
    { ...baseReq, sort_by: "updated_at" },
    { ...baseReq, sort_by: "completed_at" },
    { ...baseReq, sort_by: "title" },
    { ...baseReq, sort_by: "created_at", sort_order: "asc" },
    { ...baseReq, sort_by: "created_at", sort_order: "desc" },
    { ...baseReq, sort_by: "title", sort_order: "asc" },
    { ...baseReq, sort_by: "title", sort_order: "desc" },
    { ...baseReq, page: 2 },
    { ...baseReq, page: 99, limit: 100 },
  ];

  for (const req of filterCases) {
    const page: IPageITodoTodo.ISummary =
      await api.functional.todo.user.todos.index(connection, { body: req });
    typia.assert(page);
    TestValidator.predicate(
      "should return empty data array",
      page.data.length === 0,
    );
    TestValidator.equals("records is 0", page.pagination.records, 0);
    TestValidator.equals("pages is 0", page.pagination.pages, 0);
    TestValidator.equals(
      "current page matches request",
      page.pagination.current,
      req.page,
    );
    TestValidator.equals(
      "limit matches request",
      page.pagination.limit,
      req.limit,
    );
  }

  // For every filter, if any data ever appears, confirm its user === user1
  for (const req of filterCases) {
    const page: IPageITodoTodo.ISummary =
      await api.functional.todo.user.todos.index(connection, { body: req });
    typia.assert(page);
    for (const todo of page.data) {
      TestValidator.equals(
        "each todo must belong to user1",
        todo.user.id,
        user1.id,
      );
    }
  }

  // Confirm that querying as one user never leaks data from any other user (including user2)
  // By switching context to user2 and querying, still get only empty results
  await api.functional.auth.user.join(connection, {
    body: {
      email: user2Email,
      password: "pw1234!@#",
      ...sessionContext,
    } satisfies ITodoUser.IJoin,
  });
  for (const req of filterCases) {
    const page: IPageITodoTodo.ISummary =
      await api.functional.todo.user.todos.index(connection, { body: req });
    typia.assert(page);
    TestValidator.predicate(
      "other user also sees empty data",
      page.data.length === 0,
    );
    TestValidator.equals(
      "records is 0 for second user",
      page.pagination.records,
      0,
    );
  }
}
