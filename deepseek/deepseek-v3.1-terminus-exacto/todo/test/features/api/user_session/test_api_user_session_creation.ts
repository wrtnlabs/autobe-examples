import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Test the creation of a new user authentication session with comprehensive
 * security context recording.
 *
 * This test validates that session creation properly captures connection
 * details including IP address, current URL, and referrer information for
 * security auditing purposes. The test follows a complete workflow from user
 * registration through authentication to session creation, ensuring that all
 * security metadata is properly recorded and associated with the authenticated
 * user.
 */
export async function test_api_user_session_creation(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account with dynamic test data
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(registeredUser);

  // Step 2: Authenticate the user to obtain valid credentials
  const loginIp = `192.168.1.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<254>>()}`;
  const loginHref = typia.random<string & tags.Format<"uri">>();
  const loginReferrer = typia.random<string & tags.Format<"uri">>();

  const authenticatedUser = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      ip: loginIp,
      href: loginHref,
      referrer: loginReferrer,
    } satisfies ITodoListUser.ILogin,
  });
  typia.assert(authenticatedUser);

  // Step 3: Create a new user session with comprehensive security context
  const sessionIp = `10.0.1.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<254>>()}`;
  const sessionHref = typia.random<string & tags.Format<"uri">>();
  const sessionReferrer = typia.random<string & tags.Format<"uri">>();

  const sessionData = {
    ip: sessionIp,
    href: sessionHref,
    referrer: sessionReferrer,
  } satisfies ITodoListUserSession.ICreate;

  const createdSession = await api.functional.todoList.users.sessions.create(
    connection,
    {
      userId: authenticatedUser.id,
      body: sessionData,
    },
  );
  typia.assert(createdSession);

  // Step 4: Validate session response contains all expected security metadata
  TestValidator.equals(
    "session ID is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdSession.id,
    ),
    true,
  );
  TestValidator.equals(
    "session IP address matches input",
    createdSession.ip,
    sessionData.ip,
  );
  TestValidator.equals(
    "session URL matches input",
    createdSession.href,
    sessionData.href,
  );
  TestValidator.equals(
    "session referrer matches input",
    createdSession.referrer,
    sessionData.referrer,
  );

  // Step 5: Verify session is properly associated with the authenticated user
  TestValidator.equals(
    "session user ID matches authenticated user",
    createdSession.user.id,
    authenticatedUser.id,
  );
  TestValidator.equals(
    "session user email matches authenticated user",
    createdSession.user.email,
    authenticatedUser.email,
  );
  TestValidator.equals(
    "session user status matches authenticated user",
    createdSession.user.status,
    authenticatedUser.status,
  );

  // Step 6: Validate session timestamps
  TestValidator.predicate(
    "session creation timestamp is valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      createdSession.created_at,
    ),
  );
  TestValidator.predicate(
    "session expiration timestamp is undefined for active session",
    createdSession.expired_at === undefined,
  );

  // Step 7: Test session creation with optional IP field omitted
  const sessionWithoutIp = await api.functional.todoList.users.sessions.create(
    connection,
    {
      userId: authenticatedUser.id,
      body: {
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUserSession.ICreate,
    },
  );
  typia.assert(sessionWithoutIp);

  TestValidator.predicate(
    "session without IP field is created successfully",
    sessionWithoutIp.id !== undefined && sessionWithoutIp.id !== null,
  );

  // Step 8: Validate user summary data completeness
  TestValidator.equals(
    "user summary ID matches authenticated user",
    createdSession.user.id,
    authenticatedUser.id,
  );
  TestValidator.equals(
    "user summary email matches authenticated user",
    createdSession.user.email,
    authenticatedUser.email,
  );
  TestValidator.equals(
    "user summary status matches authenticated user",
    createdSession.user.status,
    authenticatedUser.status,
  );
  TestValidator.equals(
    "user summary created_at matches authenticated user",
    createdSession.user.created_at,
    authenticatedUser.created_at,
  );
  TestValidator.equals(
    "user summary updated_at matches authenticated user",
    createdSession.user.updated_at,
    authenticatedUser.updated_at,
  );
  TestValidator.predicate(
    "user summary deleted_at is undefined for active user",
    createdSession.user.deleted_at === undefined,
  );
}
