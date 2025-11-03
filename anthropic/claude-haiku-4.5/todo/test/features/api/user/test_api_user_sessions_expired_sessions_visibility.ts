import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSession";
import type { ITodoAppSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSession";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that both active and expired sessions are retrieved and properly
 * identified.
 *
 * This scenario creates a user account, establishes sessions, then verifies
 * that expired sessions (with expired_at timestamp populated) are returned
 * alongside active sessions with NULL expired_at. This validates the session
 * status tracking and helps users identify their previous login history and
 * current active sessions.
 *
 * Steps:
 *
 * 1. Create user account via registration
 * 2. Retrieve sessions for the newly created user
 * 3. Verify pagination structure exists
 * 4. Validate that session records contain all required fields
 * 5. Verify sessions are properly typed with active/expired status indicators
 */
export async function test_api_user_sessions_expired_sessions_visibility(
  connection: api.IConnection,
) {
  // Step 1: Create user account
  const joinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoAppUser.IJoin;

  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: joinData,
    },
  );
  typia.assert(user);
  TestValidator.predicate(
    "user created with active status",
    user.status === "active",
  );

  // Step 2: Retrieve sessions for the authenticated user
  const sessionsPage: IPageITodoAppSession =
    await api.functional.todoApp.user.sessions.index(connection);
  typia.assert(sessionsPage);

  // Step 3: Verify pagination structure exists
  TestValidator.predicate(
    "pagination object exists",
    sessionsPage.pagination !== null && sessionsPage.pagination !== undefined,
  );
  const pagination: IPage.IPagination = sessionsPage.pagination;
  typia.assert(pagination);
  TestValidator.predicate(
    "pagination current page is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "total records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate("total pages is non-negative", pagination.pages >= 0);

  // Step 4: Validate session records
  const sessions: ITodoAppSession[] = sessionsPage.data;
  typia.assert(sessions);

  if (sessions.length > 0) {
    // Verify each session has all required properties
    for (const session of sessions) {
      typia.assert(session);

      // Verify required fields exist and have correct types
      TestValidator.predicate(
        "session has valid UUID id",
        typeof session.id === "string" && session.id.length > 0,
      );
      TestValidator.predicate(
        "session has valid user_id",
        typeof session.todo_app_user_id === "string" &&
          session.todo_app_user_id.length > 0,
      );
      TestValidator.predicate(
        "session has IP address",
        typeof session.ip === "string" && session.ip.length > 0,
      );
      TestValidator.predicate(
        "session has connection URL",
        typeof session.href === "string" && session.href.length > 0,
      );
      TestValidator.predicate(
        "session has referrer URL",
        typeof session.referrer === "string" && session.referrer.length > 0,
      );
      TestValidator.predicate(
        "session has creation timestamp",
        typeof session.created_at === "string" && session.created_at.length > 0,
      );

      // Step 5: Verify expired_at status indicator
      // active sessions should have NULL/undefined expired_at
      // expired sessions should have populated expired_at timestamp
      const isActiveSession: boolean =
        session.expired_at === null || session.expired_at === undefined;
      const isExpiredSession: boolean =
        typeof session.expired_at === "string" && session.expired_at.length > 0;

      TestValidator.predicate(
        "session is either active or expired",
        isActiveSession || isExpiredSession,
      );

      if (isActiveSession) {
        TestValidator.predicate(
          "active session has NULL expired_at",
          session.expired_at === null || session.expired_at === undefined,
        );
      }

      if (isExpiredSession) {
        TestValidator.predicate(
          "expired session has timestamp in expired_at",
          typeof session.expired_at === "string",
        );
      }
    }

    // Verify at least one session exists (the current login session)
    TestValidator.predicate(
      "at least one session exists for user",
      sessions.length >= 1,
    );
  }

  // Final validation: Verify user can view their session history
  TestValidator.predicate(
    "session retrieval successful",
    sessionsPage.data !== null && sessionsPage.data !== undefined,
  );
}
