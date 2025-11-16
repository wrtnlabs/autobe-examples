import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

/**
 * Test guest registration when the client explicitly provides an IP address.
 *
 * This test validates that the system accepts and stores a client-provided IP
 * address in the guest account and session records, rather than only relying on
 * server-extracted IP from request headers. This is important for scenarios
 * like proxy configurations, server-side rendering, or when the client knows
 * its public IP better than the server can detect.
 *
 * Test Steps:
 *
 * 1. Generate random test data including an explicit IP address
 * 2. Call the guest registration API with the explicit IP address in the request
 *    body
 * 3. Validate the API response structure using typia.assert()
 * 4. Verify that the returned guest account contains the explicitly provided IP
 *    address
 * 5. Confirm that valid JWT tokens (access and refresh) are returned
 */
export async function test_api_guest_registration_with_explicit_ip(
  connection: api.IConnection,
) {
  // Generate test data with explicit IP address
  const explicitIp = "192.168.1.100";
  const requestBody = {
    ip: explicitIp,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListGuest.ICreate;

  // Register guest with explicit IP address
  const guestAccount: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: requestBody,
    });

  // Validate response structure - this performs COMPLETE type validation
  typia.assert(guestAccount);

  // Verify that the explicitly provided IP address is stored in the guest account
  TestValidator.equals(
    "guest IP matches explicitly provided IP",
    guestAccount.ip,
    explicitIp,
  );

  // Verify JWT tokens are present and generated (business logic validation)
  TestValidator.predicate(
    "access token is not empty",
    guestAccount.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is not empty",
    guestAccount.token.refresh.length > 0,
  );
}
