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
 * Test that admin can view both regular user sessions and admin sessions in the
 * system-wide session list.
 *
 * This scenario creates user and admin accounts with active sessions,
 * authenticates as admin, and retrieves all sessions to verify the session list
 * includes sessions from both user and admin actors with proper role
 * identification. This validates that admin monitoring provides complete
 * visibility into all system sessions.
 *
 * Test flow:
 *
 * 1. Register a regular user to create a user session
 * 2. Register first admin to create an admin session
 * 3. Register second admin to create another admin session
 * 4. Authenticate as the first admin
 * 5. Retrieve all system sessions
 * 6. Validate response contains all created sessions
 * 7. Verify each session has correct metadata and structure
 */
export async function test_api_admin_sessions_mixed_user_and_admin_sessions(
  connection: api.IConnection,
) {
  // Step 1: Create user account and establish user session
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const userAuth: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(userAuth);
  TestValidator.predicate(
    "user auth contains token",
    userAuth.token !== undefined,
  );
  TestValidator.predicate(
    "user auth contains access token",
    userAuth.token.access !== undefined,
  );

  // Store the user ID for later validation
  const userId = userAuth.id;

  // Step 2: Register first admin to create first admin session
  const admin1Email = typia.random<string & tags.Format<"email">>();
  const admin1Password = RandomGenerator.alphaNumeric(12);
  const admin1Auth: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: admin1Email,
        password: admin1Password,
        password_confirmation: admin1Password,
      } satisfies ITodoAppAdmin.IRegister,
    });
  typia.assert(admin1Auth);
  TestValidator.predicate(
    "admin1 auth contains token",
    admin1Auth.token !== undefined,
  );
  TestValidator.predicate(
    "admin1 auth contains access token",
    admin1Auth.token.access !== undefined,
  );

  const admin1Id = admin1Auth.id;

  // Step 3: Register second admin to create second admin session
  const admin2Email = typia.random<string & tags.Format<"email">>();
  const admin2Password = RandomGenerator.alphaNumeric(12);
  const admin2Auth: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: admin2Email,
        password: admin2Password,
        password_confirmation: admin2Password,
      } satisfies ITodoAppAdmin.IRegister,
    });
  typia.assert(admin2Auth);
  TestValidator.predicate(
    "admin2 auth contains token",
    admin2Auth.token !== undefined,
  );

  const admin2Id = admin2Auth.id;

  // Step 4: Switch to admin1 to retrieve system-wide sessions
  // The connection should have admin1's token from the join operation
  const adminConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${admin1Auth.token.access}`,
    },
  };

  // Step 5: Retrieve all system sessions as admin
  const sessionPageResponse: IPageITodoAppSession =
    await api.functional.todoApp.admin.sessions.index(adminConnection);
  typia.assert(sessionPageResponse);

  // Step 6: Validate response structure
  TestValidator.predicate(
    "response has pagination info",
    sessionPageResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(sessionPageResponse.data),
  );

  // Validate pagination structure
  const pagination: IPage.IPagination = sessionPageResponse.pagination;
  TestValidator.predicate(
    "pagination current is number",
    typeof pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination limit is number",
    typeof pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination records is number",
    typeof pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination pages is number",
    typeof pagination.pages === "number",
  );
  TestValidator.predicate("pagination current >= 0", pagination.current >= 0);
  TestValidator.predicate("pagination limit >= 0", pagination.limit >= 0);
  TestValidator.predicate("pagination records >= 0", pagination.records >= 0);
  TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);

  // Step 7: Verify sessions are in the list
  const sessions: ITodoAppSession[] = sessionPageResponse.data;
  TestValidator.predicate("at least 3 sessions returned", sessions.length >= 3);

  // Find sessions by user/admin ID
  const userSession = sessions.find((s) => s.todo_app_user_id === userId);
  const admin1Session = sessions.find((s) => s.todo_app_user_id === admin1Id);
  const admin2Session = sessions.find((s) => s.todo_app_user_id === admin2Id);

  TestValidator.predicate(
    "user session found in list",
    userSession !== undefined,
  );
  TestValidator.predicate(
    "admin1 session found in list",
    admin1Session !== undefined,
  );
  TestValidator.predicate(
    "admin2 session found in list",
    admin2Session !== undefined,
  );

  // Step 8: Validate each session structure and metadata
  if (userSession) {
    typia.assert(userSession);
    TestValidator.predicate(
      "user session has valid ID",
      userSession.id !== undefined && userSession.id.length > 0,
    );
    TestValidator.predicate(
      "user session has IP address",
      userSession.ip !== undefined && userSession.ip.length > 0,
    );
    TestValidator.predicate(
      "user session has href URL",
      userSession.href !== undefined && userSession.href.length > 0,
    );
    TestValidator.predicate(
      "user session has referrer URL",
      userSession.referrer !== undefined && userSession.referrer.length > 0,
    );
    TestValidator.predicate(
      "user session has created_at timestamp",
      userSession.created_at !== undefined && userSession.created_at.length > 0,
    );
    TestValidator.predicate(
      "user session expired_at is null or string",
      userSession.expired_at === null ||
        userSession.expired_at === undefined ||
        typeof userSession.expired_at === "string",
    );
  }

  if (admin1Session) {
    typia.assert(admin1Session);
    TestValidator.predicate(
      "admin1 session has valid ID",
      admin1Session.id !== undefined && admin1Session.id.length > 0,
    );
    TestValidator.predicate(
      "admin1 session has IP address",
      admin1Session.ip !== undefined && admin1Session.ip.length > 0,
    );
    TestValidator.predicate(
      "admin1 session has href URL",
      admin1Session.href !== undefined && admin1Session.href.length > 0,
    );
    TestValidator.predicate(
      "admin1 session has referrer URL",
      admin1Session.referrer !== undefined && admin1Session.referrer.length > 0,
    );
    TestValidator.predicate(
      "admin1 session has created_at timestamp",
      admin1Session.created_at !== undefined &&
        admin1Session.created_at.length > 0,
    );
  }

  if (admin2Session) {
    typia.assert(admin2Session);
    TestValidator.predicate(
      "admin2 session has valid ID",
      admin2Session.id !== undefined && admin2Session.id.length > 0,
    );
    TestValidator.predicate(
      "admin2 session has IP address",
      admin2Session.ip !== undefined && admin2Session.ip.length > 0,
    );
  }

  // Step 9: Verify admin can see all sessions with complete visibility
  TestValidator.equals(
    "total records match expected sessions",
    pagination.records >= 3,
    true,
  );
}
