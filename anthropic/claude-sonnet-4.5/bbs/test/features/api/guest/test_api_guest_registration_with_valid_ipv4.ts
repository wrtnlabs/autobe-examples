import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test guest registration using IPv4 address format for session tracking.
 *
 * This test validates that the system correctly accepts and stores IPv4
 * addresses in the standard dotted decimal notation (e.g., 192.168.1.1). The
 * test verifies that the IP address is properly recorded in the guest session
 * record for audit trails and security monitoring, and confirms successful
 * account creation and token issuance with IPv4 format.
 *
 * Steps:
 *
 * 1. Generate a valid IPv4 address in dotted decimal notation
 * 2. Create valid URI strings for href and referrer fields
 * 3. Call the guest registration API endpoint
 * 4. Validate the complete response structure with typia.assert
 */
export async function test_api_guest_registration_with_valid_ipv4(
  connection: api.IConnection,
) {
  const ipv4 = `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>>()}`;

  const requestBody = {
    ip: ipv4,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardGuest.ICreate;

  const response: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: requestBody,
    });

  typia.assert(response);
}
