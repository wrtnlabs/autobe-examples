import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test guest lookup for a non-existent guest ID to verify proper 404 Not Found handling.
 *
 * This scenario validates that the system correctly handles requests for guest records that do not exist in the database. The test uses a valid UUID format that is guaranteed not to exist in the guest records table, ensuring the API returns the appropriate error response.
 *
 * Special attention is given to verifying that the error response provides appropriate feedback without exposing sensitive system information, and that the HTTP 404 status is correctly returned for unauthenticated guest lookups.
 *
 * 1. Generate a valid UUID format that does not exist in the guest records table.
 * 2. Call GET /hrmPlatform/guests/{guestId} with the non-existent UUID.
 * 3. Verify HTTP 404 Not Found status code is returned via TestValidator.httpError.
 * 4. Ensure proper error handling without exposing sensitive system information.
 * 5. Confirm the guest entity data is not returned in the response (error thrown).
 */
export async function test_api_guest_lookup_nonexistent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a valid UUID that does not exist in the database
  const nonExistentGuestId = typia.random<string & tags.Format<"uuid">>();
  // 2. Attempt to retrieve the non-existent guest
  // This should throw an HttpError with 404 status
  await TestValidator.httpError(
    "non-existent guest returns 404",
    [404],
    async () => {
      await api.functional.hrmPlatform.guests.at(connection, {
        guestId: nonExistentGuestId,
      });
    },
  );
}
