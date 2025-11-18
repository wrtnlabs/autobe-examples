import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Test session creation with comprehensive security metadata including IP
 * address tracking, URL context recording, and referrer information. Validates
 * that all security context fields are properly captured and stored for audit
 * purposes.
 */
export async function test_api_user_session_creation_with_security_context(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account with random credentials
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

  const createdUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(createdUser);

  // Step 2: Login with comprehensive security context
  const loginSecurityContext = {
    ip: "192.168.1.100",
    href: "https://todolist.example.com/login" satisfies string &
      tags.Format<"uri">,
    referrer: "https://todolist.example.com/dashboard" satisfies string &
      tags.Format<"uri">,
  };

  const loggedInUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        ...loginSecurityContext,
      } satisfies ITodoListUser.ILogin,
    });
  typia.assert(loggedInUser);

  // Step 3: Create session with security metadata using the authenticated user's ID
  const sessionSecurityData = {
    ip: "192.168.1.100",
    href: "https://todolist.example.com/dashboard" satisfies string &
      tags.Format<"uri">,
    referrer: "https://todolist.example.com/login" satisfies string &
      tags.Format<"uri">,
  };

  const createdSession: ITodoListUserSession =
    await api.functional.todoList.users.sessions.create(connection, {
      userId: loggedInUser.id, // Use the ID from the authenticated user
      body: sessionSecurityData satisfies ITodoListUserSession.ICreate,
    });
  typia.assert(createdSession);

  // Step 4: Validate security metadata was properly captured
  TestValidator.equals(
    "session IP address matches provided value",
    createdSession.ip,
    sessionSecurityData.ip,
  );
  TestValidator.equals(
    "session URL matches provided href",
    createdSession.href,
    sessionSecurityData.href,
  );
  TestValidator.equals(
    "session referrer matches provided value",
    createdSession.referrer,
    sessionSecurityData.referrer,
  );

  // Step 5: Validate user association
  TestValidator.equals(
    "session user ID matches authenticated user",
    createdSession.user.id,
    loggedInUser.id,
  );
  TestValidator.equals(
    "session user email matches authenticated user",
    createdSession.user.email,
    loggedInUser.email,
  );
  TestValidator.equals(
    "session user status matches authenticated user",
    createdSession.user.status,
    loggedInUser.status,
  );

  // Step 6: Validate timestamp fields with proper ISO format validation
  TestValidator.predicate(
    "session has valid creation timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      createdSession.created_at,
    ),
  );

  // Step 7: Validate session status (expired_at should be undefined for new sessions)
  TestValidator.equals(
    "new session should not have expiration timestamp",
    createdSession.expired_at,
    undefined,
  );

  // Step 8: Comprehensive user summary validation
  TestValidator.predicate(
    "user summary ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdSession.user.id,
    ),
  );
  TestValidator.predicate(
    "user summary email is valid format",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createdSession.user.email),
  );
  TestValidator.predicate(
    "user summary has valid status",
    createdSession.user.status.length > 0,
  );
  TestValidator.predicate(
    "user summary has valid creation timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      createdSession.user.created_at,
    ),
  );
  TestValidator.predicate(
    "user summary has valid update timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      createdSession.user.updated_at,
    ),
  );
}
