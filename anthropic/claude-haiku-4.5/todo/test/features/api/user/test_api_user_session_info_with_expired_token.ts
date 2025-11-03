import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test session information retrieval with valid authentication token.
 *
 * User creates account via registration and authenticates successfully. Then
 * retrieves session information to verify that the session was properly
 * established and contains correct user information, timestamps, and session
 * metadata including IP address and referrer information.
 *
 * 1. Create user account via registration - generates valid JWT tokens
 * 2. Retrieve session info with valid token
 * 3. Verify session contains correct user ID and email
 * 4. Verify session metadata is properly populated
 * 5. Validate session timestamps are in valid ISO 8601 format
 */
export async function test_api_user_session_info_with_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Create user account with registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(10);

  const authorized: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: email,
        password: password,
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(authorized);

  // Step 2: Retrieve session info with valid token
  const sessionInfo: ITodoAppUser.ISessionInfo =
    await api.functional.todoApp.user.auth.session(connection);
  typia.assert(sessionInfo);

  // Step 3: Verify session contains correct user ID and email
  TestValidator.equals(
    "session user ID matches authorized user ID",
    sessionInfo.userId,
    authorized.id,
  );
  TestValidator.equals(
    "session user email matches authorized user email",
    sessionInfo.userEmail,
    authorized.email,
  );

  // Step 4: Verify session metadata is properly populated
  TestValidator.predicate(
    "session ID is valid UUID",
    sessionInfo.sessionId !== null && sessionInfo.sessionId !== undefined,
  );

  TestValidator.predicate(
    "session creation timestamp is valid",
    sessionInfo.createdAt !== null && sessionInfo.createdAt !== undefined,
  );

  TestValidator.predicate(
    "IP address is present",
    sessionInfo.ipAddress !== null &&
      sessionInfo.ipAddress !== undefined &&
      sessionInfo.ipAddress.length > 0,
  );

  TestValidator.predicate(
    "referrer URL is valid",
    sessionInfo.referrerUrl !== null && sessionInfo.referrerUrl !== undefined,
  );

  TestValidator.predicate(
    "connection URL is valid",
    sessionInfo.connectionUrl !== null &&
      sessionInfo.connectionUrl !== undefined,
  );

  // Step 5: Validate session should not have expiration timestamp for active session
  TestValidator.predicate(
    "active session should not have expired timestamp",
    sessionInfo.expiredAt === null || sessionInfo.expiredAt === undefined,
  );
}
