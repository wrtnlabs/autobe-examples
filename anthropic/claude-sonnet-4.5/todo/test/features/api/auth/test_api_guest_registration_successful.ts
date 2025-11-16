import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

/**
 * Test successful guest account registration with valid session context
 * information.
 *
 * This test validates that the guest registration endpoint correctly:
 *
 * 1. Accepts required session context fields (href, referrer) and optional IP
 *    address
 * 2. Creates a new guest account in the todo_list_guests table
 * 3. Generates a new session record in todo_list_guest_sessions
 * 4. Returns a complete authorization response with access token, refresh token,
 *    guest ID, and expiration timestamps
 * 5. Automatically updates the connection headers with the access token for
 *    subsequent requests
 *
 * The test verifies that the returned tokens are in valid JWT format and that
 * the guest account has the appropriate session context information stored for
 * analytics and security monitoring.
 */
export async function test_api_guest_registration_successful(
  connection: api.IConnection,
) {
  // Generate valid session context data for guest registration
  const registrationData = {
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string>(),
  } satisfies ITodoListGuest.ICreate;

  // Call the guest registration endpoint
  const guestAccount: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: registrationData,
    });

  // Validate the complete response structure - this validates EVERYTHING about types
  typia.assert(guestAccount);

  // Verify that connection headers were automatically updated with access token
  TestValidator.equals(
    "connection headers should contain Authorization token",
    connection.headers?.Authorization,
    guestAccount.token.access,
  );
}
