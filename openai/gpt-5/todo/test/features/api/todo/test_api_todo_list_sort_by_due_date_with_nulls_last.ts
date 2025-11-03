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

export async function test_api_todo_list_sort_by_due_date_with_nulls_last(
  connection: api.IConnection,
) {
  /**
   * Validate sorting by due_date with date-only semantics and nulls placed last
   * when ascending.
   *
   * Steps:
   *
   * 1. Join to create an authenticated user (POST /auth/user/join)
   * 2. Create four todos (POST /todo/user/todos): yesterday, today, tomorrow, and
   *    one with null due_date
   * 3. List with sort_by=due_date and order=asc (PATCH /todo/user/todos) and
   *    verify ordering: past < today < future, and nulls appear after all dated
   *    items
   * 4. Optionally list with order=desc and verify dated items are reversed (ignore
   *    null placement policy for desc)
   * 5. Ensure ownership scoping: all listed items belong to the authenticated user
   */

  // 1) Authenticate by joining a new user account
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Pass1234", // >= 8 chars, includes letters and digits
    ip: "127.0.0.1",
    href: "https://example.com/join",
    referrer: "",
  } satisfies ITodoUser.IJoin;
  const auth: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinBody },
  );
  typia.assert(auth);

  // Utility: create date-only string (YYYY-MM-DD) using UTC to avoid TZ drift
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const toDateOnly = (dt: Date) =>
    `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;

  // 2) Prepare dates: yesterday, today, tomorrow
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const pastDate: string & tags.Format<"date"> = toDateOnly(
    new Date(now.getTime() - dayMs),
  ) as string & tags.Format<"date">;
  const todayDate: string & tags.Format<"date"> = toDateOnly(now) as string &
    tags.Format<"date">;
  const futureDate: string & tags.Format<"date"> = toDateOnly(
    new Date(now.getTime() + dayMs),
  ) as string & tags.Format<"date">;

  // Helper to create a todo with given title and due_date (which may be null)
  const createTodo = async (
    title: string,
    due: (string & tags.Format<"date">) | null,
  ) => {
    const body = {
      title,
      description: RandomGenerator.paragraph({ sentences: 6 }),
      due_date: due,
    } satisfies ITodoTodo.ICreate;
    const created = await api.functional.todo.user.todos.create(connection, {
      body,
    });
    typia.assert(created);
    return created;
  };

  // Create four todos covering past, today, future and null
  const todoPast = await createTodo(
    RandomGenerator.paragraph({ sentences: 3 }),
    pastDate,
  );
  const todoToday = await createTodo(
    RandomGenerator.paragraph({ sentences: 3 }),
    todayDate,
  );
  const todoFuture = await createTodo(
    RandomGenerator.paragraph({ sentences: 3 }),
    futureDate,
  );
  const todoNone = await createTodo(
    RandomGenerator.paragraph({ sentences: 3 }),
    null,
  );

  // 3) List with ascending due_date sorting
  const pageAsc = await api.functional.todo.user.todos.index(connection, {
    body: {
      status: "all",
      sort_by: "due_date",
      order: "asc",
      pageSize: 50,
    } satisfies ITodoTodo.IRequest,
  });
  typia.assert(pageAsc);

  // Ownership scoping: all results belong to the authenticated user
  const allOwned = pageAsc.data.every((s) => s.owner.id === auth.id);
  TestValidator.predicate(
    "ownership scoping - all todos belong to authenticated user",
    allOwned,
  );

  // Ensure our created items are present and ordered as expected (asc)
  const ascIds = pageAsc.data.map((s) => s.id);
  const idxPast = ascIds.indexOf(todoPast.id);
  const idxToday = ascIds.indexOf(todoToday.id);
  const idxFuture = ascIds.indexOf(todoFuture.id);
  const idxNone = ascIds.indexOf(todoNone.id);

  TestValidator.predicate("asc: contains past todo", idxPast !== -1);
  TestValidator.predicate("asc: contains today todo", idxToday !== -1);
  TestValidator.predicate("asc: contains future todo", idxFuture !== -1);
  TestValidator.predicate("asc: contains null-due todo", idxNone !== -1);

  TestValidator.predicate("asc: ordering past < today", idxPast < idxToday);
  TestValidator.predicate("asc: ordering today < future", idxToday < idxFuture);
  TestValidator.predicate(
    "asc: null-due appears after dated items",
    idxFuture < idxNone,
  );

  // Null handling: the summary for the null-due item should expose due_date === null
  const nullSummary = pageAsc.data.find((s) => s.id === todoNone.id);
  if (nullSummary) {
    TestValidator.equals(
      "asc: null-due summary has null due_date",
      nullSummary.due_date,
      null,
    );
  }

  // 4) Optional: verify reverse ordering for dated items when order=desc
  const pageDesc = await api.functional.todo.user.todos.index(connection, {
    body: {
      status: "all",
      sort_by: "due_date",
      order: "desc",
      pageSize: 50,
    } satisfies ITodoTodo.IRequest,
  });
  typia.assert(pageDesc);

  const descIds = pageDesc.data.map((s) => s.id);
  const jPast = descIds.indexOf(todoPast.id);
  const jToday = descIds.indexOf(todoToday.id);
  const jFuture = descIds.indexOf(todoFuture.id);

  TestValidator.predicate("desc: contains past todo", jPast !== -1);
  TestValidator.predicate("desc: contains today todo", jToday !== -1);
  TestValidator.predicate("desc: contains future todo", jFuture !== -1);

  TestValidator.predicate(
    "desc: future should come before today",
    jFuture < jToday,
  );
  TestValidator.predicate(
    "desc: today should come before past",
    jToday < jPast,
  );
}
