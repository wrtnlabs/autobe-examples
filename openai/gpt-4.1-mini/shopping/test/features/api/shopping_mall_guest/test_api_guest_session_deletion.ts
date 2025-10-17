import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

/**
 * Test deletion of an existing guest user session by its unique identifier.
 *
 * This test performs the following steps:
 *
 * 1. Create a new guest session with random valid data for session_token, IP
 *    address and user agent.
 * 2. Verify the returned guest has a valid UUID id and is correctly created.
 * 3. Delete the guest session by id using the delete API.
 * 4. Attempt to delete the same guest session again to ensure the system rejects
 *    operations on deleted entities.
 *
 * This operation requires no authentication as it is a system-level cleanup
 * action.
 */
export async function test_api_guest_session_deletion(
  connection: api.IConnection,
) {
  // 1. Create a new guest session
  const createBody = {
    session_token: RandomGenerator.alphaNumeric(24),
    ip_address: RandomGenerator.mobile(),
    user_agent: RandomGenerator.name(3),
  } satisfies IShoppingMallGuest.ICreate;

  const guest: IShoppingMallGuest =
    await api.functional.shoppingMall.guests.create(connection, {
      body: createBody,
    });

  typia.assert(guest);

  // Verify that guest ID is a valid UUID string
  TestValidator.predicate(
    "created guest has valid UUID id",
    typeof guest.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        guest.id,
      ),
  );

  // 2. Delete the guest session by id
  await api.functional.shoppingMall.guests.erase(connection, { id: guest.id });

  // 3. Attempt to delete the same guest session again and expect an error
  await TestValidator.error(
    "deleting a non-existent guest session should fail",
    async () => {
      await api.functional.shoppingMall.guests.erase(connection, {
        id: guest.id,
      });
    },
  );
}
