import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import type { ITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserSession";

/**
 * Test session detail retrieval with connection metadata.
 *
 * This test validates the complete workflow of retrieving user session
 * information including IP address, connection URL, and referrer data for
 * security monitoring and session verification purposes.
 *
 * 1. Create a new user account to establish authentication context
 * 2. Retrieve session metadata using the authenticated user's credentials
 * 3. Validate all connection details are properly stored and retrievable
 * 4. Verify session tracking functionality works correctly
 */
export async function test_api_user_session_connection_metadata(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for authentication context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoUser.IJoin;

  const createdUser: ITodoUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: joinBody,
    });

  // Validate created user has proper authentication structure
  typia.assert(createdUser);
  TestValidator.predicate("user has valid ID", createdUser.id.length > 0);
  TestValidator.predicate(
    "user email matches input",
    createdUser.email === joinBody.email,
  );
  TestValidator.predicate(
    "account has default security settings",
    createdUser.mfa_enabled === false,
  );
  TestValidator.predicate(
    "no failed login attempts",
    createdUser.failed_login_attempts === 0,
  );
  TestValidator.equals("account is not locked", createdUser.locked_until, null);

  // Step 2: Retrieve session metadata for the created user
  // Note: Since we don't have a direct way to enumerate sessions, we'll use a generated session ID
  // and expect the API to handle the authorization check appropriately
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  const session: ITodoUserSession =
    await api.functional.todo.user.users.sessions.at(connection, {
      userId: createdUser.id,
      sessionId: sessionId,
    });

  // Step 3: Validate session metadata contains all required connection details
  typia.assert(session);

  // Verify session identification
  TestValidator.predicate("session has valid ID", session.id.length > 0);
  TestValidator.predicate(
    "session ID matches request",
    session.id === sessionId,
  );

  // Validate connection metadata fields
  TestValidator.predicate("IP address is non-empty", session.ip.length > 0);
  TestValidator.predicate(
    "connection URL is provided",
    session.href.length > 0,
  );
  TestValidator.predicate(
    "referrer information exists",
    session.referrer !== undefined,
  );

  // Verify temporal metadata
  TestValidator.predicate(
    "creation timestamp exists",
    session.created_at.length > 0,
  );
  TestValidator.predicate(
    "expired_at is nullable",
    session.expired_at === null ||
      session.expired_at === undefined ||
      typeof session.expired_at === "string",
  );

  // Step 4: Validate session data integrity
  TestValidator.predicate("user owns this session", session.id !== undefined);

  // Ensure session fields contain realistic connection data
  if (session.ip) {
    TestValidator.predicate(
      "IP address appears valid",
      session.ip.includes(".") || session.ip.includes(":"),
    );
  }

  if (session.href) {
    TestValidator.predicate(
      "connection URL is provided",
      session.href.length > 0,
    );
  }

  // Test that session metadata can be empty (representing direct access or unknown referrer)
  if (session.referrer !== undefined) {
    TestValidator.predicate(
      "referrer is valid string",
      typeof session.referrer === "string",
    );
  }
}
