import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test guest registration with empty referrer for direct access scenarios.
 *
 * This test validates that the system correctly handles guest registration when
 * users access the site directly without a referrer (e.g., typing URL directly,
 * bookmarks, or external applications). The referrer field is required but can
 * be an empty string for direct access cases.
 *
 * Test Flow:
 *
 * 1. Prepare guest registration data with empty referrer string
 * 2. Call guest registration API with valid IP and href but empty referrer
 * 3. Validate response structure and token issuance
 * 4. Verify guest account is created with proper JWT tokens
 */
export async function test_api_guest_registration_with_empty_referrer(
  connection: api.IConnection,
) {
  // Generate valid IP address (simulating client connection)
  const clientIp = `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<254>>()}`;

  // Create guest registration request with empty referrer
  const guestRegistrationData = {
    ip: clientIp,
    href: "https://example.com/discussion/board" satisfies string &
      tags.Format<"uri">,
    referrer: "" satisfies string & tags.Format<"uri">,
  } satisfies IDiscussionBoardGuest.ICreate;

  // Call guest registration API
  const authorizedGuest: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: guestRegistrationData,
    });

  // Validate response structure - typia.assert performs COMPLETE validation
  typia.assert(authorizedGuest);
}
