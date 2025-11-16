import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test that each guest registration generates a unique UUID identifier.
 *
 * This test validates the system's ability to create distinct guest IDs for
 * separate registration requests, ensuring proper isolation between different
 * guest sessions. It verifies that the UUID format is valid (UUIDv4) and that
 * no two registrations receive the same identifier.
 *
 * Process:
 *
 * 1. Create multiple guest accounts (5 registrations)
 * 2. Extract the UUID from each successful registration response
 * 3. Validate UUID format compliance via typia.assert
 * 4. Verify all generated UUIDs are distinct (no duplicates)
 * 5. Confirm proper token issuance for each guest session
 */
export async function test_api_guest_registration_unique_identifier_generation(
  connection: api.IConnection,
) {
  // Create multiple guest registrations to test uniqueness
  const guestCount = 5;
  const guests = await ArrayUtil.asyncRepeat(guestCount, async (index) => {
    const guestData = {
      ip: `192.168.1.${index + 10}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardGuest.ICreate;

    const guest = await api.functional.auth.guest.join(connection, {
      body: guestData,
    });

    typia.assert(guest);
    return guest;
  });

  // Extract all guest IDs
  const guestIds = guests.map((guest) => guest.id);

  // Validate that all IDs are unique
  const uniqueIds = new Set(guestIds);
  TestValidator.equals(
    "all guest IDs must be unique",
    uniqueIds.size,
    guestCount,
  );
}
