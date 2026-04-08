import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieval of a non-existent guest account to verify proper 404 handling.
 *
 * Validates the boundary condition where a guest UUID does not exist in the database.
 * Tests that the system correctly rejects requests for non-existent guest accounts with
 * HTTP 404 Not Found status. The test generates a random UUID that is guaranteed not to
 * exist and confirms the API responds with the appropriate error.
 *
 * Special attention is given to verifying that the error handling is consistent and that
 * the 404 status code is properly returned without exposing any sensitive data.
 *
 * 1. Generate a random UUID that is highly unlikely to exist in the database.
 * 2. Call GET /redditPlatform/guests/{guestId} with the non-existent UUID.
 * 3. Validate that the API throws an HttpError with status code 404.
 * 4. Confirm the error response indicates resource not found.
 */
export async function test_api_guest_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that is guaranteed not to exist
  const nonExistentGuestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Call the API with the non-existent guest ID and validate 404 error
  await TestValidator.httpError(
    "non-existent guest returns 404",
    404,
    async () => {
      await api.functional.redditPlatform.guests.at(connection, {
        guestId: nonExistentGuestId,
      });
    },
  );
}
