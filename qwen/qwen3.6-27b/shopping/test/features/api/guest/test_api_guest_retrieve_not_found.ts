import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a non-existent guest account via unique identifier.
 *
 * Validates the error handling when querying a guest account that does not exist in the system.
 * The test generates a random UUID that has no corresponding record in the ecommerce_platform_guests table.
 * It verifies that the endpoint correctly returns a 404 Not Found HTTP error,
 * ensuring that the system properly handles missing guest records and prevents
 * returning partial or empty data for invalid identifiers.
 *
 * 1. Generates a random UUID for a non-existent guest.
 * 2. Calls the guest retrieval endpoint.
 * 3. Validates that a 404 Not Found error is returned.
 */
export async function test_api_guest_retrieve_not_found(
  connection: api.IConnection,
) {
  await TestValidator.httpError(
    "should return 404 for non-existent guest",
    404,
    async () => {
      await api.functional.ecommercePlatform.guests.at(connection, {
        guestId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
