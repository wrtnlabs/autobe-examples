import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

/**
 * Test successful anonymous guest session creation for marketplace browsing
 *
 * This test validates that guest users can create temporary sessions for
 * product browsing and cart building without account registration. It verifies
 * that guest sessions receive appropriate access tokens for anonymous
 * marketplace functionality including product search and cart management. The
 * test confirms that guest accounts provide seamless shopping experiences for
 * users who prefer not to register while supporting conversion strategies
 * through guest checkout workflows.
 *
 * Test steps:
 *
 * 1. Generate realistic guest session data with IP address, connection URLs, and
 *    user agent
 * 2. Create guest session using auth/guest/join endpoint
 * 3. Validate response structure using typia for complete type validation
 * 4. Verify authorization token is properly structured
 * 5. Test business logic validation of session properties
 * 6. Confirm session is ready for marketplace operations
 */
export async function test_api_guest_session_creation_success(
  connection: api.IConnection,
) {
  // Generate realistic session data
  const sessionRequest = typia.random<IShoppingMallGuest.ICreate>();

  // Create guest session with proper request body
  const guestSession: IShoppingMallGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: sessionRequest,
    });

  // Validate complete response structure - typia validates ALL aspects including UUID format
  typia.assert(guestSession);

  // Verify business logic properties after complete type validation
  TestValidator.predicate(
    "session ID meets length requirements",
    guestSession.session_id.length >= 10 &&
      guestSession.session_id.length <= 64,
  );

  TestValidator.predicate(
    "access token is present",
    guestSession.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is present",
    guestSession.token.refresh.length > 0,
  );

  // Verify IP address matches what we sent (if provided)
  TestValidator.predicate(
    "IP address is present in response",
    guestSession.ip_address.length > 0,
  );

  // Test that authorization header was automatically set
  TestValidator.predicate(
    "authorization header was set",
    connection.headers?.Authorization === guestSession.token.access,
  );

  // Verify user agent matches what we sent
  TestValidator.equals(
    "user agent matches request",
    guestSession.user_agent,
    sessionRequest.user_agent,
  );
}
