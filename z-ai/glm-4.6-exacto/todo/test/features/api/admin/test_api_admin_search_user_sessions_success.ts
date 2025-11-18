import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserSession";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Validate admin's ability to search and paginate user login sessions.
 *
 * 1. Register a new admin (join), asserting authentication and proper
 *    tokens/session.
 * 2. Choose a random UUID to represent target userId for session queries.
 * 3. Call /todoApp/admin/users/{userId}/sessions with no filters to verify basic
 *    pagination.
 * 4. Apply IP/referrer/created_from/created_to/expired filters for results, if
 *    available.
 * 5. Assert that every session returned has the provided userId.
 * 6. Attempt query with non-existent userId (random UUID), confirm error raised.
 * 7. Confirm only admin auth allows access.
 */
export async function test_api_admin_search_user_sessions_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin and authenticate
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234AaBb@!",
      href: "https://admin.todoapp.test/join",
      referrer: "https://todoapp.test/landing",
      ip: undefined,
    },
  });
  typia.assert(adminJoin);
  TestValidator.predicate(
    "admin join returns token",
    typeof adminJoin.token.access === "string" &&
      adminJoin.token.access.length > 10,
  );
  const adminId = adminJoin.id;

  // 2. Choose a random UUID to emulate a userId for session search
  const targetUserId = typia.random<string & tags.Format<"uuid">>();

  // 3. List sessions for that user (may be empty) -- base pagination
  const basicPage = await api.functional.todoApp.admin.users.sessions.index(
    connection,
    {
      userId: targetUserId,
      body: {}, // default: no filter/pagination
    },
  );
  typia.assert(basicPage);
  TestValidator.predicate(
    "Has pagination object with correct structure",
    typeof basicPage.pagination === "object" &&
      typeof basicPage.pagination.current === "number",
  );
  TestValidator.equals(
    "data array is defined",
    Array.isArray(basicPage.data),
    true,
  );
  for (const session of basicPage.data) {
    typia.assert(session);
    TestValidator.equals(
      "session user_id equals requested",
      session.user_id,
      targetUserId,
    );
  }

  // 4. If data was returned, test filtering
  if (basicPage.data.length > 0) {
    const byIp = await api.functional.todoApp.admin.users.sessions.index(
      connection,
      {
        userId: targetUserId,
        body: { ip: basicPage.data[0].ip },
      },
    );
    typia.assert(byIp);
    for (const session of byIp.data) {
      TestValidator.equals(
        "ip filter should work",
        session.ip,
        basicPage.data[0].ip,
      );
    }

    const byReferrer = await api.functional.todoApp.admin.users.sessions.index(
      connection,
      {
        userId: targetUserId,
        body: { referrer: basicPage.data[0].referrer },
      },
    );
    typia.assert(byReferrer);
    for (const session of byReferrer.data) {
      TestValidator.equals(
        "referrer filter should work",
        session.referrer,
        basicPage.data[0].referrer,
      );
    }

    // Test expired filter logic (both expired and active)
    await api.functional.todoApp.admin.users.sessions.index(connection, {
      userId: targetUserId,
      body: { expired: true },
    });
    await api.functional.todoApp.admin.users.sessions.index(connection, {
      userId: targetUserId,
      body: { expired: false },
    });
    // Test creation time filtering
    await api.functional.todoApp.admin.users.sessions.index(connection, {
      userId: targetUserId,
      body: { created_from: basicPage.data[0].created_at },
    });
    await api.functional.todoApp.admin.users.sessions.index(connection, {
      userId: targetUserId,
      body: { created_to: basicPage.data[0].created_at },
    });
  }

  // 5. Test error for non-existent userId
  await TestValidator.error(
    "Query with non-existent userId should fail",
    async () => {
      await api.functional.todoApp.admin.users.sessions.index(connection, {
        userId: typia.random<string & tags.Format<"uuid">>(),
        body: {},
      });
    },
  );
}
