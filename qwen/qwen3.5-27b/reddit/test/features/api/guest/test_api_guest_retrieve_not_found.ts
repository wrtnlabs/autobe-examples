import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import type { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a non-existent guest account returns 404 Not Found.
 *
 * Validates that the guest retrieval endpoint properly handles requests for guest accounts that do not exist in the system. The test generates a valid UUID format string that is highly unlikely to correspond to any existing guest account, then attempts to retrieve it. The system should respond with HTTP 404 Not Found to indicate the guest was not found.
 *
 * This test ensures proper error handling for edge cases where clients request guest information using invalid or non-existent identifiers.
 *
 * 1. Generate a random UUID that does not correspond to any existing guest account.
 * 2. Call GET /redditClone/guests/{guestId} with the non-existent guestId.
 * 3. Verify the API returns HTTP 404 Not Found error.
 */
export async function test_api_guest_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that doesn't exist in the system
  const nonExistentGuestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempt to retrieve the non-existent guest and verify 404 error
  await TestValidator.httpError(
    "non-existent guest returns 404",
    404,
    async () =>
      await api.functional.redditClone.guests.at(connection, {
        guestId: nonExistentGuestId,
      }),
  );
}
