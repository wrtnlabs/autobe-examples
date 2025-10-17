import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";

/**
 * Test guest user logout workflow including session creation, tracking
 * verification, and session termination.
 *
 * This test validates the complete guest session lifecycle from anonymous
 * session creation through tracking to explicit session termination. The
 * workflow includes:
 *
 * 1. Creating a guest account with tracking data (IP address and user agent)
 * 2. Verifying guest session establishment with authentication tokens
 * 3. Terminating the guest session through logout
 * 4. Confirming successful session cleanup
 */
export async function test_api_guest_logout_session_termination(
  connection: api.IConnection,
) {
  // Step 1: Create a guest account with tracking data
  const guestCreateData = {
    ip_address: typia.random<string>(),
    user_agent: typia.random<string>(),
  } satisfies IRedditLikeGuest.ICreate;

  const guestAuthorized: IRedditLikeGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: guestCreateData,
    });

  // Step 2: Verify guest session is established
  typia.assert(guestAuthorized);

  TestValidator.predicate(
    "guest account has valid session identifier",
    guestAuthorized.session_identifier.length > 0,
  );

  TestValidator.equals(
    "guest role is correctly set",
    guestAuthorized.role,
    "guest",
  );

  TestValidator.predicate(
    "guest has valid authentication token",
    guestAuthorized.token.access.length > 0,
  );

  TestValidator.predicate(
    "guest has valid refresh token",
    guestAuthorized.token.refresh.length > 0,
  );

  // Step 3: Terminate the guest session through logout
  await api.functional.redditLike.auth.guest.logout(connection);

  // Step 4: Logout completes successfully (void return indicates success)
  // The session tracking data should be cleared on the server side
}
