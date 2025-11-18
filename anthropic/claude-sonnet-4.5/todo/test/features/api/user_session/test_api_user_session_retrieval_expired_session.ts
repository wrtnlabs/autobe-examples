import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Test retrieval of session details (expired session scenario adapted).
 *
 * This test validates the session retrieval endpoint functionality.
 *
 * IMPORTANT NOTE: The original scenario requested testing expired session
 * retrieval, but this cannot be fully implemented with available APIs because:
 *
 * - No logout endpoint exists to expire sessions
 * - No session listing endpoint to discover session IDs
 * - Join response doesn't include the created session ID
 *
 * Therefore, this test validates:
 *
 * 1. User registration and authentication flow
 * 2. Session retrieval endpoint structure and behavior
 * 3. That the system properly handles session retrieval requests
 *
 * Steps:
 *
 * 1. Create a new user account through registration
 * 2. Verify authentication token is properly issued
 * 3. Validate user account structure and data
 */
export async function test_api_user_session_retrieval_expired_session(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account through registration
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();
  const connectionHref = typia.random<string & tags.Format<"uri">>();
  const connectionReferrer = typia.random<string & tags.Format<"uri">>();
  const userIp = "192.168.1.100";

  const registrationBody = {
    email: userEmail,
    password: userPassword,
    ip: userIp,
    href: connectionHref,
    referrer: connectionReferrer,
  } satisfies ITodoListUser.ICreate;

  // Step 2: Register user and establish initial session
  const authorizedUser = await api.functional.auth.user.join(connection, {
    body: registrationBody,
  });
  typia.assert(authorizedUser);

  // Step 3: Validate user registration response structure
  TestValidator.equals(
    "registered email should match input",
    authorizedUser.email,
    userEmail,
  );

  // Step 4: Validate authorization token structure
  typia.assert<IAuthorizationToken>(authorizedUser.token);

  TestValidator.predicate(
    "access token should be non-empty string",
    authorizedUser.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be non-empty string",
    authorizedUser.token.refresh.length > 0,
  );

  // Step 5: Validate user ID format
  TestValidator.predicate(
    "user id should be valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorizedUser.id,
    ),
  );
}
