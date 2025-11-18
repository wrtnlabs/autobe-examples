import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdminSession";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Validate paginated audit session listing for a new admin after registration.
 *
 * 1. Register a new administrator (obtain authentication and adminId).
 * 2. List own sessions with no filters, expect 1 session (the one just created).
 * 3. List own sessions using date-time filter for created_from/created_to that
 *    includes the session created.
 * 4. List only expired sessions (should be empty, as brand-new session is active).
 * 5. List only active sessions (should find the session).
 * 6. Paginate with limit = 1 on first page (should find 1 session, page info
 *    correct).
 * 7. Paginate beyond available data (page 2), expect an empty list.
 * 8. Use a different (random) adminId to query sessions (simulating privacy
 *    test)—should not see any session records.
 */
export async function test_api_admin_session_audit_search_by_new_admin(
  connection: api.IConnection,
) {
  // 1. Register a new administrator and obtain authentication
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.todo.example/register",
    referrer: "https://admin.todo.example/landing",
  } satisfies ITodoListAdmin.IJoin;
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinInput });
  typia.assert(admin);

  // 2. Immediately after registration, list own sessions (default/no filter)
  const sessionResults: IPageITodoListAdminSession.ISummary =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {},
    });
  typia.assert(sessionResults);
  TestValidator.predicate(
    "session listing contains at least the just-created session",
    sessionResults.data.some(
      (s) =>
        s.ip === joinInput.ip &&
        s.href === joinInput.href &&
        s.referrer === joinInput.referrer,
    ),
  );
  TestValidator.equals(
    "pagination reports 1 page after initial registration",
    sessionResults.pagination.pages,
    1,
  );

  // 3. Date range filtering - should still find the session using created_from/created_to
  const sessionCreatedAt = sessionResults.data[0]?.created_at;
  typia.assert(sessionCreatedAt!);
  const byDate = await api.functional.todoList.admin.admins.sessions.index(
    connection,
    {
      adminId: admin.id,
      body: {
        created_from: sessionCreatedAt,
        created_to: sessionCreatedAt,
      },
    },
  );
  typia.assert(byDate);
  TestValidator.predicate(
    "session is found by created_from/created_to filter",
    byDate.data.some((s) => s.created_at === sessionCreatedAt),
  );

  // 4. Filter for only expired sessions (new registration: expect empty result, page info correct)
  const expired = await api.functional.todoList.admin.admins.sessions.index(
    connection,
    {
      adminId: admin.id,
      body: { expired: true },
    },
  );
  typia.assert(expired);
  TestValidator.equals(
    "no expired sessions for new admin",
    expired.data.length,
    0,
  );

  // 5. Filter for only active sessions (should get at least one session back)
  const activeSessions =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: { expired: false },
    });
  typia.assert(activeSessions);
  TestValidator.predicate(
    "at least one active session",
    activeSessions.data.length >= 1,
  );

  // 6. Paginate with limit = 1 (first page)
  const page1 = await api.functional.todoList.admin.admins.sessions.index(
    connection,
    {
      adminId: admin.id,
      body: { limit: 1, page: 1 },
    },
  );
  typia.assert(page1);
  TestValidator.equals(
    "limit 1 returns at most one session",
    page1.data.length <= 1,
    true,
  );
  TestValidator.equals(
    "pagination current page is 1",
    page1.pagination.current,
    1,
  );

  // 7. Paginate past available sessions (page 2)
  const page2 = await api.functional.todoList.admin.admins.sessions.index(
    connection,
    {
      adminId: admin.id,
      body: { limit: 1, page: 2 },
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "page 2 should be empty for just-registered admin",
    page2.data.length,
    0,
  );

  // 8. Attempt to access sessions for an unrelated, random adminId (should see no data)
  const otherAdminId = typia.random<string & tags.Format<"uuid">>();
  const otherSessions =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: otherAdminId,
      body: {},
    });
  typia.assert(otherSessions);
  TestValidator.equals(
    "new admin cannot view sessions of other admins",
    otherSessions.data.length,
    0,
  );
}
