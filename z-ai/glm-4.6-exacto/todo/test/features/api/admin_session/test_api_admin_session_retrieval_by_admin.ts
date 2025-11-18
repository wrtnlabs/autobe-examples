import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";

/**
 * Validate admin session retrieval after onboarding.
 *
 * This test ensures that after a new administrator joins the system, they can
 * retrieve their own session details using the admin session retrieval
 * endpoint. It performs both data integrity and security boundary checks.
 *
 * Step-by-step process:
 *
 * 1. Register a fresh admin account using /auth/admin/join to obtain the admin's
 *    authorized context and initial session reference (including admin ID and
 *    session ID).
 * 2. Use the retrieved admin ID and session ID to call
 *    /todoApp/admin/admins/{adminId}/sessions/{sessionId} and confirm session
 *    details can be retrieved by the admin after authentication. Validate all
 *    required fields are present: id, admin summary, IP, href, referrer,
 *    created_at, and (optionally) expired_at.
 * 3. Verify the admin ID in the session matches the admin's ID. Ensure the
 *    session's admin summary also matches the original admin's join data
 *    (excluding password hash and token).
 * 4. Attempt a session retrieval with an unauthenticated connection (no auth
 *    token) and expect an error, confirming authorization enforcement.
 */
export async function test_api_admin_session_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register new admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://admin-onboarding.todo-app.com/register",
    referrer: "https://admin-onboarding.todo-app.com/",
  } satisfies ITodoAppAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(adminAuth);
  const adminId = adminAuth.id;
  const adminSummary = {
    id: adminAuth.id,
    email: adminAuth.email,
    created_at: adminAuth.created_at,
    updated_at: adminAuth.updated_at,
  } satisfies ITodoAppAdmin.ISummary;
  const sessionSummary = adminAuth.session!;
  typia.assert(sessionSummary);

  // 2. Retrieve the session using authenticated admin context
  const session = await api.functional.todoApp.admin.admins.sessions.at(
    connection,
    {
      adminId,
      sessionId: sessionSummary.id,
    },
  );
  typia.assert(session);

  // 3. Assert that session details match expectations
  TestValidator.equals(
    "admin ID in session matches created admin",
    session.admin_id,
    adminId,
  );
  TestValidator.equals("session id matches", session.id, sessionSummary.id);
  TestValidator.equals(
    "admin summary in session matches",
    session.admin,
    adminSummary,
  );
  TestValidator.equals("session IP matches", session.ip, joinBody.ip);
  TestValidator.equals("session href matches", session.href, joinBody.href);
  TestValidator.equals(
    "session referrer matches",
    session.referrer,
    joinBody.referrer,
  );
  TestValidator.equals(
    "session created_at matches",
    session.created_at,
    sessionSummary.created_at,
  );

  // 4. Security: Attempt session retrieval as unauthenticated client
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated client cannot retrieve admin session",
    async () => {
      await api.functional.todoApp.admin.admins.sessions.at(
        unauthenticatedConn,
        {
          adminId,
          sessionId: sessionSummary.id,
        },
      );
    },
  );
}
