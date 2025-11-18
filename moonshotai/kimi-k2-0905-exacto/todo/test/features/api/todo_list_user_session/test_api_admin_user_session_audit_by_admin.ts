import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserSession";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Validate admin-driven audit of user session history with privacy and access
 * control.
 *
 * 1. Register a new admin with sufficient context (IP, href, referrer).
 * 2. With admin privileges, issue a session audit request for a random user UUID,
 *    using pagination and search filters via PATCH
 *    /todoList/admin/users/{userId}/sessions.
 * 3. Validate paginated session results: confirm each session summary omits
 *    sensitive tokens, includes proper audit metadata (id, timestamps, IP,
 *    href, referrer), and has correct pagination fields.
 * 4. Switch to unauthenticated context (simulate missing Authorization), attempt
 *    session audit and confirm error is thrown.
 * 5. Re-authenticate as admin and confirm endpoint accepts access only for admin
 *    actors.
 */
export async function test_api_admin_user_session_audit_by_admin(
  connection: api.IConnection,
) {
  // 1. Register new admin
  const adminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://admin-testing.example.com/signup",
    referrer: "https://admin-testing.example.com/",
  } satisfies ITodoListAdmin.IJoin;
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoin });
  typia.assert(admin);
  TestValidator.predicate("admin account is not locked", !admin.is_locked);

  // 2. Audit user sessions as admin
  const targetUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const sessionFilter = {
    page: 1,
    limit: 10,
    order_by: RandomGenerator.pick(["created_at", "expired_at"] as const),
    order: RandomGenerator.pick(["asc", "desc"] as const),
    search: undefined,
  } satisfies ITodoListUserSession.IRequest;

  const auditResult: IPageITodoListUserSession.ISummary =
    await api.functional.todoList.admin.users.sessions.index(connection, {
      userId: targetUserId,
      body: sessionFilter,
    });
  typia.assert(auditResult);

  // 3. Validate session summary paginated response structure
  TestValidator.predicate(
    "correct pagination structure present",
    typeof auditResult.pagination.current === "number" &&
      typeof auditResult.pagination.limit === "number" &&
      typeof auditResult.pagination.records === "number" &&
      typeof auditResult.pagination.pages === "number",
  );

  for (const session of auditResult.data) {
    typia.assert(session);
    TestValidator.predicate(
      "session summary omits sensitive data",
      typeof (session as any).token === "undefined",
    );
    TestValidator.predicate(
      "session summary has ID",
      typeof session.id === "string",
    );
    TestValidator.predicate(
      "session has creation timestamp",
      typeof session.created_at === "string",
    );
    TestValidator.predicate("session has IP", typeof session.ip === "string");
    TestValidator.predicate(
      "session has href",
      typeof session.href === "string",
    );
    TestValidator.predicate(
      "session has referrer",
      typeof session.referrer === "string",
    );
    // expired_at may be null or undefined for active sessions
    if (session.expired_at !== null && session.expired_at !== undefined)
      TestValidator.predicate(
        "expired_at is ISO date",
        typeof session.expired_at === "string",
      );
  }

  // 4. Simulate unauthenticated context - remove Authorization, expect error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated non-admin cannot audit user session history",
    async () => {
      await api.functional.todoList.admin.users.sessions.index(unauthConn, {
        userId: targetUserId,
        body: sessionFilter,
      });
    },
  );

  // 5. Re-authenticate as another admin, expect success
  const newAdminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://admin-testing.example.com/signup2",
    referrer: "https://admin-testing.example.com/",
  } satisfies ITodoListAdmin.IJoin;

  const newAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: newAdminJoin });
  typia.assert(newAdmin);

  const auditResult2: IPageITodoListUserSession.ISummary =
    await api.functional.todoList.admin.users.sessions.index(connection, {
      userId: targetUserId,
      body: sessionFilter,
    });
  typia.assert(auditResult2);
}
