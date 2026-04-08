import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test guest account retrieval with non-existent ID returns 404 Not Found.
 *
 * Validates the system's error handling when attempting to retrieve a guest account that does not exist. This test generates a valid UUID format that has no corresponding guest record in the database and verifies the API returns the expected 404 HTTP status code.
 *
 * This edge case testing ensures the anonymous user session management system properly handles invalid resource references without exposing internal system details or returning misleading success responses. The 404 response confirms that the guest lookup correctly distinguishes between existing and non-existing guest accounts.
 *
 * 1. Generate a random UUID in valid format that does not exist in the system.
 * 2. Attempt to retrieve guest account using the non-existent ID.
 * 3. Verify HTTP 404 Not Found is returned as per specification.
 */
export async function test_api_guest_account_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID that doesn't correspond to any existing guest
  const nonExistentGuestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempt to retrieve non-existent guest - should return 404
  await TestValidator.httpError(
    "guest not found returns 404",
    404,
    async () => {
      await api.functional.redditCommunity.guests.at(connection, {
        guestId: nonExistentGuestId,
      });
    },
  );
}
