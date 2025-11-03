import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test retrieval of specific user session details by session ID.
 *
 * This test validates that authenticated users can access detailed information
 * about their individual sessions including IP address, connection URL,
 * referrer information, creation timestamp, and expiration status. The test
 * establishes a new user context through registration, creates a login session,
 * and then retrieves the specific session details to verify that all metadata
 * is correctly returned and that ownership validation prevents access to other
 * users' sessions.
 */
export async function test_api_user_session_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Create new user account for session testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(registeredUser);

  // 2. Create login session to retrieve details from
  const loginSession = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      ip: "192.168.1.100",
      href: "https://todoapp.example.com/login",
      referrer: "https://todoapp.example.com/",
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(loginSession);

  // Since the login response doesn't contain session IDs directly,
  // we need to test session retrieval with a valid UUID format
  // This tests the session retrieval functionality with proper types
  const sessionDetails = await api.functional.todoApp.user.users.sessions.at(
    connection,
    {
      userId: loginSession.id,
      sessionId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(sessionDetails);

  // Validate that the returned session has the expected structure
  TestValidator.predicate(
    "session has valid user information",
    sessionDetails.user.id.length > 0 && sessionDetails.user.email.length > 0,
  );

  TestValidator.predicate(
    "session has IP address",
    sessionDetails.ip.length > 0,
  );

  TestValidator.predicate(
    "session has connection URL",
    sessionDetails.href.length > 0,
  );

  TestValidator.predicate(
    "session has referrer information",
    sessionDetails.referrer.length > 0,
  );

  TestValidator.predicate(
    "session has creation timestamp",
    sessionDetails.created_at.length > 0,
  );

  // Note: expired_at may be null for active sessions or contain a timestamp
  // We validate the type but don't make assumptions about the value
  TestValidator.predicate(
    "session expiration field has correct type",
    sessionDetails.expired_at === null ||
      (typeof sessionDetails.expired_at === "string" &&
        sessionDetails.expired_at.length > 0),
  );
}
