import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieval of non-existent or soft-deleted guest accounts returns 404 Not Found.
 *
 * Validates that the guest retrieval endpoint correctly handles requests for guest accounts that do not exist or have been soft-deleted. This ensures proper privacy protection and access control for guest records.
 *
 * 1. Generate a valid UUID that does not correspond to any existing guest account.
 * 2. Call GET /shoppingMall/guests/{guestId} with the non-existent guestId.
 * 3. Verify the API throws an HTTP error with status code 404 Not Found.
 */
export async function test_api_guest_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a non-existent guest ID (valid UUID format but doesn't exist in database)
  const nonExistentGuestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempt to retrieve non-existent guest and expect 404 error
  await TestValidator.httpError(
    "non-existent guest returns 404 Not Found",
    404,
    async () =>
      await api.functional.shoppingMall.guests.at(connection, {
        guestId: nonExistentGuestId,
      }),
  );
}
