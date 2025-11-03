import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdminSession";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";

/**
 * Validate admin session search and filtering for a specific administrator.
 *
 * Workflow:
 *
 * 1. Create a fresh admin via POST /auth/admin/join (creates authorization token
 *    and an initial session record in typical implementations).
 * 2. Use the authorized connection (SDK automatically sets Authorization header on
 *    join) to call PATCH /todoApp/admin/admins/{adminId}/sessions with various
 *    filters and pagination parameters.
 * 3. Assert type-safety (typia.assert) and business rules (ownership, filtering
 *    behavior) using TestValidator.
 * 4. Verify unauthorized callers cannot access the session listing.
 */
export async function test_api_admin_sessions_search_by_admin(
  connection: api.IConnection,
) {
  // 1) Create a fresh admin (join) - this establishes an authenticated actor
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const createBody = {
    email: adminEmail,
    password: "P@ssw0rd123",
    display_name: RandomGenerator.name(),
    role: "support",
    href: "https://example.com/signup",
    referrer: "https://referrer.example.com/",
  } satisfies ITodoAppAdmin.ICreate;

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: createBody,
    },
  );
  typia.assert(admin);

  // 2) Retrieve sessions for the created admin with default pagination (status=all)
  const allSessions: IPageITodoAppAdminSession.ISummary =
    await api.functional.todoApp.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {
        status: "all",
        page: 1,
        pageSize: 25,
      } satisfies ITodoAppAdminSession.IRequest,
    });
  typia.assert(allSessions);

  // Basic structural and ownership checks
  TestValidator.predicate(
    "response contains pagination object",
    typeof allSessions.pagination === "object" &&
      allSessions.pagination !== null,
  );
  TestValidator.predicate("data is an array", Array.isArray(allSessions.data));
  TestValidator.predicate(
    "all returned sessions belong to the created admin",
    allSessions.data.every((s) => s.admin.id === admin.id),
  );

  // 3) Status filter: active only
  const activeSessions: IPageITodoAppAdminSession.ISummary =
    await api.functional.todoApp.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {
        status: "active",
        page: 1,
        pageSize: 25,
      } satisfies ITodoAppAdminSession.IRequest,
    });
  typia.assert(activeSessions);

  // Business rule: active sessions must not be expired. Accept null/undefined
  // expiredAt as active, or a future timestamp as active.
  TestValidator.predicate(
    "active filter returns only non-expired sessions",
    activeSessions.data.every((s) => {
      if (s.expiredAt === null || s.expiredAt === undefined) return true;
      const expired = new Date(s.expiredAt).getTime();
      return expired > Date.now();
    }),
  );

  // 4) createdAtFrom filter using a future timestamp -> expect zero results
  const futureISO = new Date(Date.now() + 1000 * 60 * 60).toISOString();
  const futureFiltered: IPageITodoAppAdminSession.ISummary =
    await api.functional.todoApp.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {
        createdAtFrom: futureISO,
        page: 1,
        pageSize: 25,
      } satisfies ITodoAppAdminSession.IRequest,
    });
  typia.assert(futureFiltered);
  TestValidator.equals(
    "future createdAtFrom yields no sessions",
    futureFiltered.data.length,
    0,
  );

  // 5) Unauthorized caller should not be able to retrieve sessions
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized callers cannot access admin sessions",
    async () => {
      await api.functional.todoApp.admin.admins.sessions.index(unauthConn, {
        adminId: admin.id,
        body: {
          status: "all",
          page: 1,
          pageSize: 25,
        } satisfies ITodoAppAdminSession.IRequest,
      });
    },
  );
}
