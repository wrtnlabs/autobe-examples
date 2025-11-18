import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Validate administrator session detail retrieval and audit compliance.
 *
 * This test validates that an administrator can retrieve the detailed
 * authentication session information for a specific user via the
 * /todoList/admin/users/{userId}/sessions/{sessionId} endpoint. The scenario
 * requires:
 *
 * 1. Registering a new admin account to have access to privileged audit endpoints
 *    (POST /auth/admin/join).
 * 2. Authenticating as the newly created admin (done via join response).
 * 3. As administrator, attempt to retrieve a user session detail using GET
 *    /todoList/admin/users/{userId}/sessions/{sessionId}.
 * 4. Validate the returned ITodoListUserSession contains all required metadata
 *    (id, todo_list_user_id, ip, href, referrer, created_at, expired_at) and
 *    values are reasonable.
 * 5. Check that only sessions belonging to the userId are accessible (cannot
 *    retrieve session from another user or non-existent session).
 * 6. Ensure business logic: a. Ownership is enforced (session must belong to
 *    provided userId). b. Compliance/audit guarantees (required fields present
 *    for traceability).
 * 7. Attempt to retrieve a non-existent session and validate error is handled as
 *    expected.
 */
export async function test_api_admin_session_detail_retrieval_audit_workflow(
  connection: api.IConnection,
) {
  // 1. Register and login as admin
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://admin.test/autojoin",
    referrer: "https://admin.test/login",
    ip: "192.168.1.10",
  } satisfies ITodoListAdmin.ICreate;
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminBody });
  typia.assert(admin);
  TestValidator.equals(
    "auth response contains admin email",
    admin.email,
    adminBody.email,
  );
  TestValidator.predicate(
    "admin has a session summary",
    admin.session !== undefined && admin.session !== null,
  );

  // 2. Extract admin session (for negative test and basic validation)
  const adminSession: ITodoListAdminSession.ISummary | undefined =
    admin.session;

  // 3. Provision a secondary user session entity for target testing
  //   (simulate via random values, as we don't have a real user join API in scope, focus on behavior)
  // Use plausible UUIDs for both user and session for positive/negative scenarios
  const testUserId = typia.random<string & tags.Format<"uuid">>();
  const testSessionId = typia.random<string & tags.Format<"uuid">>();

  // Prepare a plausible ITodoListUserSession entity manually for validation
  const fakeSession: ITodoListUserSession = {
    id: testSessionId,
    todo_list_user_id: testUserId,
    ip: "203.0.113.15",
    href: "https://example.com/profile",
    referrer: "https://example.com/dashboard",
    created_at: new Date().toISOString(),
    expired_at: null,
  };

  // 4. Test (simulate) retrieval - this would require a provisioned session in a real system
  // We expect a not-found error in this state unless there was a real user/session provisioning step.
  await TestValidator.error(
    "retrieval of non-existent user session gives error",
    async () => {
      await api.functional.todoList.admin.users.sessions.at(connection, {
        userId: testUserId,
        sessionId: testSessionId,
      });
    },
  );

  // 5. If admin has a real session summary from join, attempt to fetch it (should succeed)
  if (adminSession) {
    const adminSessionDetails =
      await api.functional.todoList.admin.users.sessions.at(connection, {
        userId: adminSession.id,
        sessionId: adminSession.id,
      });
    typia.assert(adminSessionDetails);
    TestValidator.equals(
      "admin session belongs to admin user",
      adminSessionDetails.todo_list_user_id,
      adminSession.id,
    );
    TestValidator.predicate(
      "session IP address present",
      typeof adminSessionDetails.ip === "string" &&
        adminSessionDetails.ip.length > 0,
    );
    TestValidator.predicate(
      "session href present",
      typeof adminSessionDetails.href === "string" &&
        adminSessionDetails.href.length > 0,
    );
    TestValidator.predicate(
      "session referrer present",
      typeof adminSessionDetails.referrer === "string" &&
        adminSessionDetails.referrer.length > 0,
    );
    TestValidator.predicate(
      "session created_at is ISO8601",
      typeof adminSessionDetails.created_at === "string" &&
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
          adminSessionDetails.created_at,
        ),
    );
  }
}
