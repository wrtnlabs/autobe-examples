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
 * Validates the retrieval of authenticated user sessions.
 *
 * This test creates a new user account through registration, establishes an
 * authenticated session, and then retrieves the list of all sessions associated
 * with that user. The test verifies that:
 *
 * 1. User registration successful and session is automatically established
 * 2. Session list can be retrieved for authenticated user
 * 3. Session data includes all required metadata (ID, user ID, IP, URL, referrer,
 *    timestamps)
 * 4. Current session appears in the retrieved session list
 * 5. Session pagination information is correctly provided
 *
 * The test ensures the session tracking functionality works correctly and users
 * can monitor their active and expired sessions across devices.
 */
export async function test_api_user_sessions_retrieval_authenticated(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account and establish authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(10);

  const authenticatedUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(authenticatedUser);

  // Verify user credentials
  TestValidator.equals(
    "authenticated user email matches input",
    authenticatedUser.email,
    userEmail,
  );
  TestValidator.predicate(
    "authenticated user status is active",
    authenticatedUser.status === "active",
  );
  TestValidator.predicate(
    "authentication token is provided",
    !!authenticatedUser.token,
  );
  TestValidator.predicate(
    "access token exists",
    !!authenticatedUser.token.access,
  );
  TestValidator.predicate(
    "refresh token exists",
    !!authenticatedUser.token.refresh,
  );

  // Step 2: Retrieve the session list for the authenticated user
  const sessionList =
    await api.functional.todoApp.user.sessions.index(connection);
  typia.assert(sessionList);

  // Step 3: Validate session list structure and pagination
  TestValidator.predicate(
    "session list has pagination",
    !!sessionList.pagination,
  );
  TestValidator.predicate(
    "pagination has current page",
    sessionList.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    sessionList.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has total records",
    sessionList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    sessionList.pagination.pages >= 0,
  );

  // Step 4: Verify session data exists and contains expected fields
  TestValidator.predicate(
    "session list contains data",
    Array.isArray(sessionList.data),
  );
  TestValidator.predicate(
    "at least one session exists for authenticated user",
    sessionList.data.length > 0,
  );

  // Step 5: Validate individual session record structure and data
  const currentSession = sessionList.data[0];
  typia.assert(currentSession);

  TestValidator.predicate(
    "session has unique ID",
    !!currentSession.id && typeof currentSession.id === "string",
  );
  TestValidator.predicate(
    "session ID is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      currentSession.id,
    ),
  );
  TestValidator.predicate(
    "session belongs to authenticated user",
    currentSession.todo_app_user_id === authenticatedUser.id,
  );
  TestValidator.predicate(
    "session has IP address",
    !!currentSession.ip && typeof currentSession.ip === "string",
  );
  TestValidator.predicate(
    "session has connection URL",
    !!currentSession.href && typeof currentSession.href === "string",
  );
  TestValidator.predicate(
    "session has referrer URL",
    !!currentSession.referrer && typeof currentSession.referrer === "string",
  );
  TestValidator.predicate(
    "session has creation timestamp",
    !!currentSession.created_at &&
      typeof currentSession.created_at === "string",
  );

  // Step 6: Verify session status (active or expired)
  if (
    currentSession.expired_at !== undefined &&
    currentSession.expired_at !== null
  ) {
    TestValidator.predicate(
      "expired session has valid expiration timestamp",
      typeof currentSession.expired_at === "string",
    );
  } else {
    TestValidator.predicate(
      "current session is active with no expiration",
      currentSession.expired_at === null ||
        currentSession.expired_at === undefined,
    );
  }

  // Step 7: Verify pagination calculation is correct
  const expectedPages = Math.ceil(
    sessionList.pagination.records / sessionList.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages matches calculation",
    sessionList.pagination.pages,
    expectedPages,
  );

  // Step 8: Verify all sessions in list have required structure
  for (const session of sessionList.data) {
    typia.assert(session);
    TestValidator.predicate(
      `session ${session.id} has valid structure`,
      !!session.id &&
        !!session.todo_app_user_id &&
        !!session.ip &&
        !!session.href &&
        !!session.referrer &&
        !!session.created_at,
    );
  }
}
