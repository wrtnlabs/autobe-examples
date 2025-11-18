import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserSession";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Validate self-service session listing for authenticated Todo List user.
 *
 * 1. Register a new Todo List user account (userA) and collect their authorization
 *    token.
 * 2. Register a second Todo List user (userB) to verify cross-user access is
 *    denied.
 * 3. As userA, call the session listing endpoint with default paging and assert
 *    only their sessions are present.
 * 4. Check all session audit metadata: ip, href, referrer, created_at, and
 *    expired_at are present and in expected format.
 * 5. Call with explicit pagination, sort, and date range filters and confirm
 *    limits/order are respected.
 * 6. Attempt unauthenticated access (empty headers) and confirm access is denied
 *    (error thrown).
 * 7. (If possible) Attempt, as userB, to access userA's sessions—confirm
 *    cross-user access is not permitted.
 */
export async function test_api_user_session_list_self_audit(
  connection: api.IConnection,
) {
  // 1. Register userA (and login implicitly)
  const regUrl = "https://todoapp.com/register";
  const refUrl = "https://todoapp.com/landing";
  const userA_email = typia.random<string & tags.Format<"email">>();
  const userA_password = RandomGenerator.alphaNumeric(12);
  const userA: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userA_email,
        password: userA_password,
        display_name: RandomGenerator.name(),
        ip: "127.0.0.1", // supply a sample IP for audit testing
        href: regUrl,
        referrer: refUrl,
      } satisfies ITodoListUser.IJoin,
    },
  );
  typia.assert(userA);

  // 2. Register userB (will login implicitly)
  const userB_email = typia.random<string & tags.Format<"email">>();
  const userB_password = RandomGenerator.alphaNumeric(12);
  const userB: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userB_email,
        password: userB_password,
        display_name: RandomGenerator.name(),
        href: regUrl,
        referrer: refUrl,
      } satisfies ITodoListUser.IJoin,
    },
  );
  typia.assert(userB);

  // 3. As userA, fetch session list with default paging (should see only own sessions)
  const sessionPage: IPageITodoListUserSession =
    await api.functional.todoList.user.users.me.sessions.index(connection, {
      body: {} satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(sessionPage);
  TestValidator.predicate(
    "session list contains only sessions for userA",
    sessionPage.data.every((session) => session.todo_list_user_id === userA.id),
  );
  TestValidator.predicate(
    "all session meta fields present",
    sessionPage.data.every(
      (sess) =>
        !!sess.id &&
        !!sess.ip &&
        !!sess.href &&
        !!sess.referrer &&
        !!sess.created_at,
    ),
  );

  // 4. Validate session metadata format
  sessionPage.data.forEach((session, idx) => {
    TestValidator.predicate(
      `session ${idx} - id is UUID`,
      typeof session.id === "string" && /[a-f0-9\-]{36}/.test(session.id),
    );
    TestValidator.predicate(
      `session ${idx} - created_at date-time`,
      typeof session.created_at === "string" &&
        !isNaN(Date.parse(session.created_at)),
    );
    if (session.expired_at !== undefined && session.expired_at !== null)
      TestValidator.predicate(
        `session ${idx} - expired_at date-time`,
        typeof session.expired_at === "string" &&
          !isNaN(Date.parse(session.expired_at)),
      );
  });

  // 5. Paging/limit and ordering check
  const paged = await api.functional.todoList.user.users.me.sessions.index(
    connection,
    {
      body: {
        page: 1,
        limit: 2,
        order_by: "created_at",
        order: "desc",
      } satisfies ITodoListUserSession.IRequest,
    },
  );
  typia.assert(paged);
  TestValidator.predicate("paging enforced", paged.data.length <= 2);
  if (paged.data.length >= 2) {
    TestValidator.predicate(
      "ordering by created_at desc",
      new Date(paged.data[0].created_at) >= new Date(paged.data[1].created_at),
    );
  }

  // 6. Date range filter
  if (sessionPage.data.length > 0) {
    const from = sessionPage.data[0].created_at;
    const to = sessionPage.data[sessionPage.data.length - 1].created_at;
    const filtered = await api.functional.todoList.user.users.me.sessions.index(
      connection,
      {
        body: { from, to } satisfies ITodoListUserSession.IRequest,
      },
    );
    typia.assert(filtered);
    for (const sess of filtered.data) {
      TestValidator.predicate(
        "session " + sess.id + " created_at >= from",
        new Date(sess.created_at) >= new Date(from),
      );
      TestValidator.predicate(
        "session " + sess.id + " created_at <= to",
        new Date(sess.created_at) <= new Date(to),
      );
    }
  }

  // 7. Unauthenticated access (empty headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated users cannot list sessions",
    async () => {
      await api.functional.todoList.user.users.me.sessions.index(unauthConn, {
        body: {} satisfies ITodoListUserSession.IRequest,
      });
    },
  );

  // 8. (Bonus) As userB (switched), should only see their own sessions
  // (simulate login as userB by using their token)
  connection.headers = { Authorization: userB.token.access };
  const bSessions = await api.functional.todoList.user.users.me.sessions.index(
    connection,
    {
      body: {} satisfies ITodoListUserSession.IRequest,
    },
  );
  typia.assert(bSessions);
  TestValidator.predicate(
    "userB session list contains only their own sessions",
    bSessions.data.every((sess) => sess.todo_list_user_id === userB.id),
  );
}
