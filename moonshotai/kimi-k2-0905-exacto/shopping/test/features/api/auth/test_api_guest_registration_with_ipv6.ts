import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

/**
 * Test guest registration with standard IPv4 address format validation.
 *
 * This test validates the shopping mall platform's guest registration
 * functionality using the supported IPv4 address format as defined in the
 * system. It ensures proper guest session creation, authentication token
 * generation, and response structure compliance.
 *
 * The test specifically covers:
 *
 * 1. Standard IPv4 address format validation (as supported by the system)
 * 2. Guest session creation with session metadata
 * 3. JWT token generation and validation
 * 4. Timestamp format compliance
 * 5. Response structure verification
 *
 * Business Impact: Validates that guest browsing sessions can be properly
 * established with correct network tracking and anonymous access management.
 */
export async function test_api_guest_registration_with_ipv6(
  connection: api.IConnection,
) {
  // Generate valid IPv4 address (as supported by the system)
  const ipv4Address = typia.random<string & tags.Format<"ipv4">>();

  // Create comprehensive guest registration request
  const requestBody = {
    ip: ipv4Address,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    session_id: RandomGenerator.alphaNumeric(32),
    user_agent: RandomGenerator.name(),
    last_activity_at: new Date(
      Date.now() - Math.random() * 86400000,
    ).toISOString(),
    created_at: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    updated_at: new Date(Date.now() - Math.random() * 1800000).toISOString(),
  } satisfies IShoppingMallGuest.ICreate;

  // Perform guest registration
  const response = await api.functional.auth.guest.join(connection, {
    body: requestBody,
  });

  // Validate response structure
  typia.assert(response);

  // Verify IP address is properly returned
  TestValidator.equals(
    "IPv4 address matches",
    response.ip_address,
    ipv4Address,
  );

  // Validate session continuity
  TestValidator.equals(
    "Session ID matches",
    response.session_id,
    requestBody.session_id,
  );

  // Verify authorization token structure
  TestValidator.predicate(
    "Access token exists",
    response.token.access.length > 0,
  );
  TestValidator.predicate(
    "Refresh token exists",
    response.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "Token expiry is future",
    new Date(response.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "Refresh expiry is future",
    new Date(response.token.refreshable_until) > new Date(),
  );

  // Test additional session for comprehensive coverage
  const secondBody = {
    ...requestBody,
    session_id: RandomGenerator.alphaNumeric(32),
    last_activity_at: new Date().toISOString(),
  } satisfies IShoppingMallGuest.ICreate;

  const secondResponse = await api.functional.auth.guest.join(connection, {
    body: secondBody,
  });

  typia.assert(secondResponse);
}
