import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test guest registration when the client explicitly provides an IP address.
 *
 * This test validates the guest registration functionality in server-side
 * rendering scenarios where the IP address is explicitly provided in the
 * request body rather than being extracted from HTTP headers. The test ensures
 * that:
 *
 * 1. The system accepts the explicitly provided IP address
 * 2. The response contains the client-provided IP address
 * 3. All other session fields are initialized correctly (timestamps, page_views)
 * 4. JWT tokens are issued normally with proper access and refresh tokens
 *
 * This validates the flexibility of IP address handling for different
 * deployment architectures, particularly for SSR applications.
 */
export async function test_api_guest_registration_with_explicit_ip_address(
  connection: api.IConnection,
) {
  // Generate a unique session identifier for this guest
  const sessionIdentifier = typia.random<string & tags.Format<"uuid">>();

  // Generate an explicit IP address (IPv4 format)
  const explicitIpAddress = `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>>()} `;

  // Generate a realistic user agent string
  const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  // Create the request body with explicit IP address
  const requestBody = {
    session_identifier: sessionIdentifier,
    ip_address: explicitIpAddress,
    user_agent: userAgent,
  } satisfies IDiscussionBoardGuest.ICreate;

  // Call the guest registration API
  const response: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: requestBody,
    });

  // Validate the response structure - this validates ALL type aspects including UUID format, timestamps, etc.
  typia.assert(response);

  // Verify the response contains the exact IP address we provided
  TestValidator.equals(
    "response IP address matches provided IP address",
    response.ip_address,
    explicitIpAddress,
  );

  // Verify the session identifier matches
  TestValidator.equals(
    "response session identifier matches provided session identifier",
    response.session_identifier,
    sessionIdentifier,
  );

  // Verify the user agent matches
  TestValidator.equals(
    "response user agent matches provided user agent",
    response.user_agent,
    userAgent,
  );

  // Verify page_views is initialized to 0
  TestValidator.equals(
    "page views initialized to zero",
    response.page_views,
    0,
  );
}
