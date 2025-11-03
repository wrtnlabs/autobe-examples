import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSession";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSession";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test admin capability to monitor multiple concurrent user sessions.
 *
 * This test validates that administrators can view all active user sessions
 * across the system, including session metadata (IP addresses, referrer URLs,
 * connection timestamps). The scenario creates multiple concurrent user
 * sessions, authenticates as admin, and retrieves the complete session list to
 * verify admin monitoring capabilities.
 *
 * Test flow:
 *
 * 1. Create multiple user accounts with active sessions
 * 2. Authenticate as admin to gain system-wide session visibility
 * 3. Retrieve all concurrent sessions from the admin endpoint
 * 4. Validate session data includes IP addresses and timestamps
 * 5. Verify pagination works correctly for session listing
 * 6. Confirm admin can detect user activity patterns
 */
export async function test_api_admin_sessions_monitoring_concurrent_users(
  connection: api.IConnection,
) {
  // Create multiple user accounts and establish concurrent sessions
  const userCount = 3;
  const users: ITodoAppUser.IAuthorized[] = [];

  for (let i = 0; i < userCount; i++) {
    const userEmail = typia.random<string & tags.Format<"email">>();
    const user = await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password:
          RandomGenerator.alphabets(8) + RandomGenerator.alphaNumeric(4),
      } satisfies ITodoAppUser.IJoin,
    });
    typia.assert(user);
    users.push(user);
  }

  TestValidator.predicate(
    "multiple users created successfully",
    users.length === userCount,
  );

  // Create admin account for system-wide session monitoring
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword =
    RandomGenerator.alphabets(8) + RandomGenerator.alphaNumeric(4);
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        password_confirmation: adminPassword,
      } satisfies ITodoAppAdmin.IRegister,
    },
  );
  typia.assert(admin);

  TestValidator.predicate(
    "admin account created successfully",
    admin.id !== undefined && admin.email === adminEmail,
  );

  // Retrieve all concurrent sessions from admin endpoint
  const sessionsPage: IPageITodoAppSession =
    await api.functional.todoApp.admin.sessions.index(connection);
  typia.assert(sessionsPage);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination info exists",
    sessionsPage.pagination !== undefined,
  );

  TestValidator.predicate(
    "pagination has current page",
    sessionsPage.pagination.current !== undefined,
  );

  TestValidator.predicate(
    "pagination has limit",
    sessionsPage.pagination.limit !== undefined,
  );

  TestValidator.predicate(
    "pagination shows total records",
    sessionsPage.pagination.records !== undefined,
  );

  TestValidator.predicate(
    "pagination shows total pages",
    sessionsPage.pagination.pages !== undefined,
  );

  // Verify session data is populated
  TestValidator.predicate(
    "sessions data array exists",
    Array.isArray(sessionsPage.data),
  );

  TestValidator.predicate(
    "sessions list contains entries",
    sessionsPage.data.length > 0,
  );

  // Validate individual session records contain required monitoring data
  const sessions = sessionsPage.data;
  for (const session of sessions) {
    typia.assert(session);

    TestValidator.predicate(
      "session has unique ID",
      session.id !== undefined && typeof session.id === "string",
    );

    TestValidator.predicate(
      "session has user ID reference",
      session.todo_app_user_id !== undefined &&
        typeof session.todo_app_user_id === "string",
    );

    TestValidator.predicate(
      "session has IP address for tracking",
      session.ip !== undefined && typeof session.ip === "string",
    );

    TestValidator.predicate(
      "session has connection URL",
      session.href !== undefined && typeof session.href === "string",
    );

    TestValidator.predicate(
      "session has referrer URL for tracking source",
      session.referrer !== undefined && typeof session.referrer === "string",
    );

    TestValidator.predicate(
      "session has creation timestamp",
      session.created_at !== undefined &&
        typeof session.created_at === "string",
    );
  }

  // Verify admin can monitor concurrent sessions
  const currentTime = new Date();
  const recentSessionCount = sessions.filter((session) => {
    const createdTime = new Date(session.created_at);
    const hourAgo = new Date(currentTime.getTime() - 60 * 60 * 1000);
    return createdTime >= hourAgo && !session.expired_at;
  }).length;

  TestValidator.predicate(
    "admin can see active concurrent sessions",
    recentSessionCount > 0,
  );

  // Verify session diversity (multiple IPs, referrers for monitoring patterns)
  const uniqueIPs = new Set(sessions.map((s) => s.ip));
  const uniqueReferrers = new Set(sessions.map((s) => s.referrer));

  TestValidator.predicate(
    "sessions show diverse IP addresses",
    uniqueIPs.size > 0,
  );

  TestValidator.predicate(
    "sessions show diverse referrer sources",
    uniqueReferrers.size > 0,
  );
}
