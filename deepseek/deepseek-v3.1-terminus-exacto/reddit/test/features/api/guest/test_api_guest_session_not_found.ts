import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";

/**
 * Test error handling when attempting to retrieve a non-existent guest session.
 * Validates proper error response when guest ID does not correspond to any
 * active or expired session in the system. Tests boundary conditions using
 * valid UUID formats that don't exist in the system.
 */
export async function test_api_guest_session_not_found(
  connection: api.IConnection,
) {
  // Test 1: Attempt to retrieve a guest session with a randomly generated UUID
  // This should fail since no guest session exists with this ID
  // Uses proper UUID format to test business logic, not type validation
  await TestValidator.error(
    "non-existent guest session should throw error",
    async () => {
      await api.functional.communityPlatform.guests.at(connection, {
        guestId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // Test 2: Attempt to retrieve with another valid but non-existent UUID
  // Tests that the error handling is consistent across different non-existent IDs
  await TestValidator.error(
    "another non-existent guest session should throw error",
    async () => {
      await api.functional.communityPlatform.guests.at(connection, {
        guestId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // Test 3: Test with a UUID that follows proper format but is unlikely to exist
  // Uses sequential UUID pattern that's valid but not assigned
  await TestValidator.error(
    "sequential pattern UUID should throw error",
    async () => {
      await api.functional.communityPlatform.guests.at(connection, {
        guestId:
          "00000000-0000-0000-0000-000000000000" satisfies string as string,
      });
    },
  );
}
