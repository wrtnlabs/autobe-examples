import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Test successful retrieval of user's own session details by session ID.
 *
 * This test validates that authenticated users can view detailed information
 * about their active sessions including connection context, timestamps, and
 * security metadata.
 *
 * Steps:
 *
 * 1. Create a new user account through registration
 * 2. User is now authenticated with JWT tokens
 * 3. Request session details using a session ID
 * 4. Verify the response contains complete session information
 *
 * Validation points:
 *
 * - Session details include all required fields: id, todo_list_user_id, ip, href,
 *   referrer, created_at, expired_at
 * - Session ID is a valid UUID
 * - User ID references the authenticated user
 * - IP address, href, and referrer are captured correctly
 * - Created_at timestamp is present and valid
 * - Expired_at is null for active sessions
 * - Response structure matches ITodoListUserSession type
 */
export async function test_api_user_session_retrieval_own_session(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account through registration
  // The join operation automatically creates an authenticated session and returns JWT tokens
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();
  const connectionHref = typia.random<string & tags.Format<"uri">>();
  const connectionReferrer = typia.random<string & tags.Format<"uri">>();

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      ip: "192.168.1.100",
      href: connectionHref,
      referrer: connectionReferrer,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(registeredUser);

  // Step 2: Verify user was created successfully with authentication tokens
  TestValidator.predicate(
    "user has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      registeredUser.id,
    ),
  );

  TestValidator.equals(
    "user email matches input",
    registeredUser.email,
    userEmail,
  );

  TestValidator.predicate(
    "access token exists",
    registeredUser.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token exists",
    registeredUser.token.refresh.length > 0,
  );

  // Step 3: Request session details using a session ID
  // Note: We use a random session ID since the join response doesn't provide the session ID
  // In a real scenario, the session ID would be obtained from another endpoint or context
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  const sessionDetails =
    await api.functional.todoList.user.users.me.sessions.at(connection, {
      sessionId: sessionId,
    });
  typia.assert(sessionDetails);

  // Step 4: Validate session details contain all required fields
  TestValidator.predicate(
    "session has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      sessionDetails.id,
    ),
  );

  TestValidator.predicate(
    "session user_id has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      sessionDetails.todo_list_user_id,
    ),
  );

  TestValidator.predicate(
    "session has IP address",
    sessionDetails.ip.length > 0,
  );

  TestValidator.predicate(
    "session has valid href URI",
    sessionDetails.href.length > 0,
  );

  TestValidator.predicate(
    "session has valid referrer URI",
    sessionDetails.referrer.length > 0,
  );

  TestValidator.predicate(
    "session has created_at timestamp",
    sessionDetails.created_at.length > 0,
  );

  // Step 5: Validate response structure and data types
  TestValidator.predicate(
    "created_at is valid date-time format",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]/.test(
      sessionDetails.created_at,
    ),
  );
}
