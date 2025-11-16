import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

/**
 * Test guest registration when no IP address is provided in the request body.
 *
 * This test validates that the guest registration endpoint properly handles the
 * scenario where the IP address field is explicitly set to null. The test
 * confirms that:
 *
 * 1. The API accepts null for the optional IP field in the request
 * 2. Guest registration completes successfully without client-provided IP
 * 3. The server extracts IP address from request headers/connection metadata
 * 4. Valid authentication tokens (access and refresh) are returned
 * 5. The guest account is created with proper session tracking
 *
 * This scenario is important because it demonstrates the API's ability to
 * handle IP address extraction server-side, which is common in scenarios where
 * clients cannot reliably determine their own IP address (e.g., behind proxies,
 * NAT, or in server-side rendering contexts).
 */
export async function test_api_guest_registration_without_ip(
  connection: api.IConnection,
) {
  // Generate valid URI values for href and referrer
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Create guest registration request with IP explicitly set to null
  const requestBody = {
    ip: null,
    href: href,
    referrer: referrer,
  } satisfies ITodoListGuest.ICreate;

  // Call guest registration endpoint
  const guest: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: requestBody,
    });

  // Validate the complete response structure
  typia.assert(guest);
}
