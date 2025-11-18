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
 * Validate that an admin can retrieve details of their own session via
 * /todoList/admin/admins/{adminId}/sessions/{sessionId}.
 *
 * 1. Register a new admin (obtain id/token)
 * 2. List all sessions for the admin to get a valid sessionId
 * 3. Call the session detail endpoint for this sessionId
 * 4. Check the returned detail (fields + correct ownership)
 * 5. Attempt to access a session not owned by this admin and confirm an error
 */
export async function test_api_admin_session_detail_audit_access(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    href: "https://admin.test.autobe/session-detail",
    referrer: "https://admin.test.autobe/landing",
    ip: null,
  } satisfies ITodoListAdmin.IJoin;
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);
  const adminId = adminAuthorized.id;

  // 2. Retrieve session list for the admin
  const sessionsPage =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId,
      body: {}, // No filtering, get all
    });
  typia.assert(sessionsPage);
  TestValidator.predicate(
    "session list contains at least one session",
    sessionsPage.data.length > 0,
  );
  const sessionSummary = sessionsPage.data[0];
  const sessionId = sessionSummary.id;

  // 3. Access session detail
  const sessionDetail = await api.functional.todoList.admin.admins.sessions.at(
    connection,
    {
      adminId,
      sessionId,
    },
  );
  typia.assert(sessionDetail);
  TestValidator.equals(
    "session id matches expected",
    sessionDetail.id,
    sessionId,
  );
  TestValidator.equals(
    "session admin id matches authenticated admin",
    sessionDetail.admin.id,
    adminId,
  );
  TestValidator.equals(
    "session admin email matches",
    sessionDetail.admin.email,
    adminAuthorized.email,
  );
  TestValidator.predicate(
    "session ip is non-empty string",
    typeof sessionDetail.ip === "string" && sessionDetail.ip.length > 0,
  );
  TestValidator.predicate(
    "session href is non-empty string",
    typeof sessionDetail.href === "string" && sessionDetail.href.length > 0,
  );
  TestValidator.predicate(
    "session referrer is non-empty string",
    typeof sessionDetail.referrer === "string" &&
      sessionDetail.referrer.length > 0,
  );
  TestValidator.predicate(
    "session created_at is ISO date",
    typeof sessionDetail.created_at === "string" &&
      sessionDetail.created_at.endsWith("Z"),
  );

  // 4. Attempt to access a random (likely non-existent) sessionId
  const randomSessionId = typia.random<string & tags.Format<"uuid">>();
  if (randomSessionId !== sessionId) {
    await TestValidator.error(
      "should fail to access invalid sessionId detail",
      async () => {
        await api.functional.todoList.admin.admins.sessions.at(connection, {
          adminId,
          sessionId: randomSessionId,
        });
      },
    );
  }
}
