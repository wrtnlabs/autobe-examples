import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a non-existent guest account returns 404 Not Found.
 *
 * Validates that the guest retrieval endpoint properly handles requests for guest records that do not exist in the system. This test ensures appropriate error handling distinguishes between missing resources and other error conditions.
 *
 * The endpoint should return 404 Not Found when attempting to access a guest account with an ID that has no corresponding record in the database. This includes both never-existing IDs and soft-deleted records.
 *
 * 1. Generate a random UUID that does not exist in the guest table.
 * 2. Attempt to retrieve the guest account using the non-existent ID.
 * 3. Verify the API throws an HttpError with 404 status code.
 * 4. Confirm the error response properly indicates the resource was not found.
 */
export async function test_api_guest_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a UUID that will not exist in the database
  const nonExistentGuestId = typia.random<string & tags.Format<"uuid">>();
  // Verify that requesting a non-existent guest ID returns 404 Not Found
  await TestValidator.httpError(
    "non-existent guest returns 404",
    404,
    async () => {
      await api.functional.todoApp.guests.at(connection, {
        guestId: nonExistentGuestId,
      });
    },
  );
}
