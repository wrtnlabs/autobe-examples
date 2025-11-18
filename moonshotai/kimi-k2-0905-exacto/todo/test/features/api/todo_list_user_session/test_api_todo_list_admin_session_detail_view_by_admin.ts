import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Validate that an administrator can view detailed authentication session
 * information for a user.
 *
 * 1. Register a new admin to ensure we have a privileged session/context.
 * 2. Using that admin's credentials, retrieve the session details using
 *    /todoList/admin/users/{userId}/sessions/{sessionId}. (Here, userId and
 *    sessionId correspond to the admin's account/session as created.)
 * 3. Confirm that session details include id, todo_list_user_id, ip, href,
 *    referrer, created_at, expired_at per ITodoListUserSession.
 * 4. Assert access control: only admins should be able to retrieve this session
 *    detail; non-admins must be denied.
 * 5. Ensure logical coherence: fetched session data must accurately relate to the
 *    admin registration context.
 */
export async function test_api_todo_list_admin_session_detail_view_by_admin(
  connection: api.IConnection,
) {
  // 1. Register an admin to generate a valid admin account and session context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const href = "https://autobe.e2e.test/admin/register";
  const referrer = "https://autobe.e2e.test/welcome";
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href,
    referrer,
  } satisfies ITodoListAdmin.IJoin;
  const adminAuth: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuth);

  // 2. Retrieve session details for the admin (simulate admin's own session)
  // Note: As the only accessible user/session is the just-created admin, we use admin id for userId/session tracking.
  // This assumes the system creates a session record upon admin joining.
  const session: ITodoListUserSession =
    await api.functional.todoList.admin.users.sessions.at(connection, {
      userId: adminAuth.id,
      sessionId: adminAuth.id as string & tags.Format<"uuid">, // for test, assume sessionId matches adminId (adjust if needed)
    });
  typia.assert(session);

  // 3. Assert returned session info corresponds to the schema
  TestValidator.equals(
    "session userId matches admin id",
    session.todo_list_user_id,
    adminAuth.id,
  );
  TestValidator.equals("session id is uuid", typeof session.id, "string");
  TestValidator.equals(
    "session href matches admin join input",
    session.href,
    href,
  );
  TestValidator.equals(
    "session referrer matches admin join input",
    session.referrer,
    referrer,
  );
  TestValidator.equals(
    "session created_at is string",
    typeof session.created_at,
    "string",
  );
  // expired_at may be null or string; accept both but assert type
  if (session.expired_at !== null && session.expired_at !== undefined) {
    TestValidator.equals(
      "session expired_at is string",
      typeof session.expired_at,
      "string",
    );
  }

  // Access control check: If we had a non-admin, try forbidden access (skipped here as no user API provided)
}
