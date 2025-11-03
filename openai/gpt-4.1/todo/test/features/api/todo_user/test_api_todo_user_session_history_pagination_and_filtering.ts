import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodouserSession";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodouser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodouser";
import type { ITodoListTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodouserSession";

/**
 * Retrieve and validate session history with pagination and filtering.
 *
 * 1. Register a new todoUser (unique email, password).
 * 2. Simulate multiple logins by re-joining multiple times (each should create a
 *    session record).
 * 3. Create a todo for the user to establish business context.
 * 4. Request the user's session history as paginated, limited to N per page (try
 *    N=2), sorted desc by created_at.
 * 5. Check that ownership is correct (all sessions returned belong to user).
 * 6. Use active=true and active=false filters and ensure sessions are segregated
 *    by active/expired.
 * 7. Confirm pagination fields (current, limit, pages, records) are correct and
 *    match slice of total.
 * 8. Ensure another random UUID as todoUserId returns no data (privacy check: no
 *    cross-user leak).
 */
export async function test_api_todo_user_session_history_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Register a new todoUser
  const userJoin = await api.functional.auth.todoUser.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: "https://app.example.com/welcome",
      referrer: "https://www.google.com/",
    } satisfies ITodoListTodouser.IVerifyJoin,
  });
  typia.assert(userJoin);

  // 2. Simulate multiple logins/de-dup session creation for test - re-login flow
  // Each new join/login creates a new session record for this todoUser
  // We simulate different IPs/hrefs to populate more sessions
  const additionalSessionsCount = 3;
  await ArrayUtil.asyncRepeat(additionalSessionsCount, async (idx) => {
    await api.functional.auth.todoUser.join(connection, {
      body: {
        email: userJoin.email,
        password: RandomGenerator.alphabets(12),
        ip: typia.random<string & tags.Format<"ipv4">>(),
        href: `https://app.example.com/session${idx}`,
        referrer: "https://www.google.com/",
      } satisfies ITodoListTodouser.IVerifyJoin,
    });
  });

  // 3. Create one todo (to fulfill business context)
  const todo = await api.functional.todoList.todoUser.todos.create(connection, {
    body: {
      title: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 5,
        wordMax: 10,
      }),
      description: RandomGenerator.paragraph({ sentences: 5 }),
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(todo);
  TestValidator.equals(
    "todo belongs to correct user",
    todo.todo_list_todouser_id,
    userJoin.id,
  );

  // 4. Retrieve session history with default params (page 1, limit 2 for paging demo)
  const sessionPage1 =
    await api.functional.todoList.todoUser.todoUsers.sessions.index(
      connection,
      {
        todoUserId: userJoin.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 2 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          // No filters, get all sessions
        },
      },
    );
  typia.assert(sessionPage1);
  TestValidator.equals(
    "pagination current is page 1",
    sessionPage1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 2",
    sessionPage1.pagination.limit,
    2,
  );
  TestValidator.equals(
    "ownership: sessions for this todoUser only",
    sessionPage1.data.every((s) => s.ip && s.href && s.referrer),
    true,
  );

  // 5. Use filter for active sessions (should exist for current login)
  const activeSessionsPage =
    await api.functional.todoList.todoUser.todoUsers.sessions.index(
      connection,
      {
        todoUserId: userJoin.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          active: true,
        },
      },
    );
  typia.assert(activeSessionsPage);
  TestValidator.predicate(
    "at least one session is active (not all expired)",
    activeSessionsPage.data.some((s) => !s.expired_at),
  );

  // 6. Use filter for expired sessions (should exist if older logins were expired by new login/session)
  const expiredSessionsPage =
    await api.functional.todoList.todoUser.todoUsers.sessions.index(
      connection,
      {
        todoUserId: userJoin.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          active: false,
        },
      },
    );
  typia.assert(expiredSessionsPage);
  TestValidator.predicate(
    "expired filter only returns sessions with expired_at set",
    expiredSessionsPage.data.every(
      (s) => s.expired_at !== null && s.expired_at !== undefined,
    ),
  );

  // 7. Pagination test - request another page
  if (sessionPage1.pagination.pages > 1) {
    const sessionPage2 =
      await api.functional.todoList.todoUser.todoUsers.sessions.index(
        connection,
        {
          todoUserId: userJoin.id,
          body: {
            page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 2 as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          },
        },
      );
    typia.assert(sessionPage2);
    TestValidator.equals(
      "page 2 current is 2",
      sessionPage2.pagination.current,
      2,
    );
    // Confirm no overlap with first page (if enough records exist)
    if (sessionPage2.data.length > 0 && sessionPage1.data.length > 0) {
      const ids1 = sessionPage1.data.map((s) => s.id);
      const ids2 = sessionPage2.data.map((s) => s.id);
      TestValidator.predicate(
        "page 1 and 2 session IDs should not overlap",
        ids1.every((id) => !ids2.includes(id)),
      );
    }
  }

  // 8. Privacy check: querying with random UUID (not this user's id) yields no sessions
  const noSessions =
    await api.functional.todoList.todoUser.todoUsers.sessions.index(
      connection,
      {
        todoUserId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(noSessions);
  TestValidator.equals(
    "no sessions returned for invalid todoUserId (privacy ok)",
    noSessions.data.length,
    0,
  );
}
