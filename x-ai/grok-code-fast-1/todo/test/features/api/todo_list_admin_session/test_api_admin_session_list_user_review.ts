import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserSession";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Validate the administrator's ability to review user session history.
 *
 * 1. Register new admin (obtain admin session credentials)
 * 2. Register new user (and trigger a session by joining)
 * 3. As admin, fetch the user's session list and verify all session data matches
 *    expected userId
 * 4. Use pagination (page=1, limit=1) to test pagination logic
 * 5. Use search/filtering (search/referrer/ip/from/to/status) to test all advanced
 *    parameters
 * 6. Attempt to use session-list as a regular user, confirm access is denied
 *
 * Also asserts that essential session metadata (ip, href, referrer, created_at,
 * expired_at) exist and are correct types.
 */
export async function test_api_admin_session_list_user_review(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminReq = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://test-admin-join.com/" + RandomGenerator.alphaNumeric(8),
    referrer: "https://referrer.com/" + RandomGenerator.alphaNumeric(6),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoListAdmin.ICreate;
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminReq });
  typia.assert(admin);

  // 2. Register user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userReq = {
    email: userEmail,
    password: RandomGenerator.alphaNumeric(10) + "1aA",
    display_name: RandomGenerator.name(),
    href: "https://user-join.com/" + RandomGenerator.alphaNumeric(7),
    referrer: "https://user-ref.com/" + RandomGenerator.alphaNumeric(4),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoListUser.IJoin;
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: userReq },
  );
  typia.assert(user);

  // 3. As admin, review user's session list (basic)
  const page1: IPageITodoListUserSession =
    await api.functional.todoList.admin.users.sessions.index(connection, {
      userId: user.id,
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      },
    });
  typia.assert(page1);
  TestValidator.predicate(
    "sessions belong to correct user",
    page1.data.every((s) => s.todo_list_user_id === user.id),
  );
  TestValidator.predicate("session list not empty", page1.data.length > 0);
  for (const session of page1.data) {
    typia.assert(session);
    TestValidator.equals(
      "session.todo_list_user_id matches user",
      session.todo_list_user_id,
      user.id,
    );
  }

  // 4. Pagination logic: page=1, limit=1
  const paged = await api.functional.todoList.admin.users.sessions.index(
    connection,
    {
      userId: user.id,
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 1 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      },
    },
  );
  typia.assert(paged);
  TestValidator.equals("pagination.limit is 1", paged.pagination.limit, 1);
  TestValidator.equals("pagination.current is 1", paged.pagination.current, 1);
  TestValidator.predicate("at most 1 session", paged.data.length <= 1);

  // 5. Use search/filtering
  // Filtering by from/to is tested by using dates from session records
  if (page1.data.length > 0) {
    const targetSession = page1.data[0];
    const fromDate: string & tags.Format<"date-time"> =
      targetSession.created_at;
    const toDate: string & tags.Format<"date-time"> = targetSession.created_at;
    const filter = await api.functional.todoList.admin.users.sessions.index(
      connection,
      {
        userId: user.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          search: targetSession.ip,
          from: fromDate,
          to: toDate,
          status: targetSession.expired_at == null ? "active" : "expired",
        },
      },
    );
    typia.assert(filter);
    TestValidator.predicate(
      "filtered results have correct ip and status",
      filter.data.every(
        (s) =>
          s.ip === targetSession.ip &&
          (targetSession.expired_at == null
            ? s.expired_at === null
            : s.expired_at !== null),
      ),
    );
  }

  // 6. Attempt to use session-list as a regular user (should fail)
  // Switch auth context: join as new user (tokens are updated automatically)
  await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10) + "Xz9",
      display_name: RandomGenerator.name(),
      href: "https://other-user-join.com/" + RandomGenerator.alphaNumeric(6),
      referrer: "https://other-user-ref.com/" + RandomGenerator.alphaNumeric(6),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoListUser.IJoin,
  });
  await TestValidator.error(
    "non-admin cannot access other user's session list",
    async () => {
      await api.functional.todoList.admin.users.sessions.index(connection, {
        userId: user.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 1 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      });
    },
  );
}
