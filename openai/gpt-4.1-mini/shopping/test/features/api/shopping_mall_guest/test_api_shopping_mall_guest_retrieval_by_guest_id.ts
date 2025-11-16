import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

export async function test_api_shopping_mall_guest_retrieval_by_guest_id(
  connection: api.IConnection,
) {
  // Step 1: Create a guest user record
  const guestCreateBody = {
    session_id: RandomGenerator.alphaNumeric(16),
    device_info: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
    ip_address: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallGuest.ICreate;

  const createdGuest = await api.functional.shoppingMall.guests.create(
    connection,
    {
      body: guestCreateBody,
    },
  );
  typia.assert(createdGuest);

  // Step 2: Retrieve guest details by guestId
  const retrievedGuest = await api.functional.shoppingMall.guests.at(
    connection,
    {
      guestId: createdGuest.id,
    },
  );
  typia.assert(retrievedGuest);

  // Validate returned data
  TestValidator.equals(
    "retrieved guest ID should match created guest ID",
    retrievedGuest.id,
    createdGuest.id,
  );
  TestValidator.predicate(
    "retrieved guest has valid created_at",
    typeof retrievedGuest.created_at === "string" &&
      retrievedGuest.created_at.length > 0,
  );
  TestValidator.predicate(
    "retrieved guest has valid updated_at",
    typeof retrievedGuest.updated_at === "string" &&
      retrievedGuest.updated_at.length > 0,
  );

  // Optional deleted_at can be null or undefined explicitly
  if (
    retrievedGuest.deleted_at !== null &&
    retrievedGuest.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "retrieved guest deleted_at is string if defined",
      typeof retrievedGuest.deleted_at === "string",
    );
  }

  // Step 3: Test error for non-existing guestId
  const nonExistentGuestId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail for non-existent guest ID",
    async () => {
      await api.functional.shoppingMall.guests.at(connection, {
        guestId: nonExistentGuestId,
      });
    },
  );
}
