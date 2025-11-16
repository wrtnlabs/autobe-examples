import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test guest registration using IPv6 address format for session tracking.
 *
 * This test validates that the system correctly accepts and stores IPv6
 * addresses in standard notation (e.g.,
 * 2001:0db8:85a3:0000:0000:8a2e:0370:7334).
 *
 * Verify that modern IPv6 addresses are properly handled and stored in the
 * guest session record. Confirm successful account creation and token issuance
 * with IPv6 format.
 *
 * Steps:
 *
 * 1. Generate a valid IPv6 address in standard notation
 * 2. Create valid URI values for href and referrer
 * 3. Register a guest user with the IPv6 address
 * 4. Validate the response contains guest ID and tokens
 */
export async function test_api_guest_registration_with_valid_ipv6(
  connection: api.IConnection,
) {
  const ipv6Address = "2001:0db8:85a3:0000:0000:8a2e:0370:7334";

  const guestCreateData = {
    ip: ipv6Address,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardGuest.ICreate;

  const guest = await api.functional.auth.guest.join(connection, {
    body: guestCreateData,
  });

  typia.assert(guest);
}
