import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSession";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSession";

/**
 * Test retrieval of all system-wide sessions for an authenticated admin user.
 *
 * This scenario validates that admins can view all active and expired sessions
 * across all users in the system for monitoring purposes. The test creates an
 * admin account, authenticates as admin, and retrieves the system-wide session
 * list to verify visibility into all user and admin sessions.
 *
 * Workflow:
 *
 * 1. Create admin account with valid credentials
 * 2. Admin is automatically authenticated upon successful registration
 * 3. Retrieve system-wide session list using admin authorization
 * 4. Validate pagination structure and session data integrity
 * 5. Verify admin has access to all sessions in the system
 */
export async function test_api_admin_sessions_system_wide_retrieval(
  connection: api.IConnection,
) {
  // 1. Create admin account with valid credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);

  const adminRegistration = {
    email: adminEmail,
    password: adminPassword,
    password_confirmation: adminPassword,
  } satisfies ITodoAppAdmin.IRegister;

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: adminRegistration,
    },
  );
  typia.assert(admin);

  // Verify admin account created successfully
  TestValidator.predicate(
    "admin account created with correct email",
    admin.email === adminEmail,
  );
  TestValidator.equals(
    "admin account status is active",
    admin.status,
    "active",
  );
  typia.assert<string & tags.Format<"date-time">>(admin.created_at);
  typia.assert<string & tags.Format<"date-time">>(admin.updated_at);

  // 2. Verify authentication token was issued
  TestValidator.predicate(
    "admin received valid authorization token",
    admin.token !== null && admin.token !== undefined,
  );
  typia.assert(admin.token);
  typia.assert<string>(admin.token.access);
  typia.assert<string>(admin.token.refresh);

  // 3. Retrieve system-wide session list using admin authorization
  const sessionList: IPageITodoAppSession =
    await api.functional.todoApp.admin.sessions.index(connection);
  typia.assert(sessionList);

  // 4. Validate pagination structure
  TestValidator.predicate(
    "session list has pagination information",
    sessionList.pagination !== null && sessionList.pagination !== undefined,
  );
  typia.assert<IPage.IPagination>(sessionList.pagination);

  TestValidator.predicate(
    "pagination current page is valid",
    sessionList.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    sessionList.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "total records count is valid",
    sessionList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages count is valid",
    sessionList.pagination.pages >= 0,
  );

  // 5. Validate session data array exists and is properly typed
  TestValidator.predicate(
    "session list contains data array",
    Array.isArray(sessionList.data),
  );
  typia.assert<ITodoAppSession[]>(sessionList.data);

  // 6. If sessions exist, validate each session's structure
  if (sessionList.data.length > 0) {
    const firstSession = sessionList.data[0];

    // Validate session ID is UUID format
    typia.assert<string & tags.Format<"uuid">>(firstSession.id);

    // Validate user association ID
    typia.assert<string & tags.Format<"uuid">>(firstSession.todo_app_user_id);

    // Validate IP address exists
    TestValidator.predicate(
      "session has IP address",
      firstSession.ip !== null &&
        firstSession.ip !== undefined &&
        firstSession.ip.length > 0,
    );

    // Validate href is valid URI
    typia.assert<string & tags.Format<"uri">>(firstSession.href);

    // Validate referrer is valid URI
    typia.assert<string & tags.Format<"uri">>(firstSession.referrer);

    // Validate creation timestamp
    typia.assert<string & tags.Format<"date-time">>(firstSession.created_at);

    // Validate expiration timestamp (can be null for active sessions)
    if (
      firstSession.expired_at !== null &&
      firstSession.expired_at !== undefined
    ) {
      typia.assert<string & tags.Format<"date-time">>(firstSession.expired_at);
    }
  }

  // 7. Verify admin can successfully access system-wide sessions
  TestValidator.predicate(
    "admin successfully retrieved system-wide sessions",
    sessionList.pagination.records >= 0,
  );
}
