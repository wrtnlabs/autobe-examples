import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

export async function test_api_shopping_mall_guest_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Create a new shopping mall guest
  const createdGuest =
    await api.functional.shoppingMall.shoppingMallGuests.create(connection, {
      body: {} satisfies IShoppingMallGuest.ICreate,
    });
  typia.assert(createdGuest);

  // 2. Retrieve the guest by ID
  const retrievedGuest =
    await api.functional.shoppingMall.shoppingMallGuests.at(connection, {
      shoppingMallGuestId: createdGuest.id,
    });
  typia.assert(retrievedGuest);

  // 3. Validate the retrieved guest matches the created guest
  TestValidator.equals(
    "Retrieved guest matches created guest",
    retrievedGuest,
    createdGuest,
  );

  // 4. Attempt to retrieve guest with non-existent ID
  const invalidGuestId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "Retrieving non-existent guest ID should throw error",
    async () => {
      await api.functional.shoppingMall.shoppingMallGuests.at(connection, {
        shoppingMallGuestId: invalidGuestId,
      });
    },
  );
}
