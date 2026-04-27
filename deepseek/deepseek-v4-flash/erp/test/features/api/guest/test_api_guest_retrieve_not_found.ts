import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuest";
import type { IHrmTimeTrackingGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a guest record with a non-existent UUID.
 *
 * Generates a random UUID that does not correspond to any existing guest record in the database and attempts to retrieve it. Verifies that the API returns a 404 Not Found HTTP error, confirming proper error handling for missing resources.
 *
 * No authentication is required for this endpoint, so no session setup is needed.
 *
 * 1. Generate a random non-existent UUID.
 * 2. Attempt to retrieve the guest record by that UUID.
 * 3. Assert that a 404 HTTP error is thrown.
 */
export async function test_api_guest_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for the guest endpoint (no auth needed)
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate a UUID that does not exist in the database
  const nonExistentGuestId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve a guest with a non-existent UUID
  await TestValidator.httpError("guest not found", 404, () =>
    api.functional.hrmTimeTracking.guests.at(guestConnection, {
      guestId: nonExistentGuestId,
    }),
  );
}
