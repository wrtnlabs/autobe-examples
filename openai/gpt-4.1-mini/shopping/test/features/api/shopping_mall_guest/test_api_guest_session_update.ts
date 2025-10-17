import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

export async function test_api_guest_session_update(
  connection: api.IConnection,
) {
  // Create a guest session
  const createBody = {
    session_token: RandomGenerator.alphaNumeric(32),
    ip_address: `${RandomGenerator.alphabets(3)}.example.com`,
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  } satisfies IShoppingMallGuest.ICreate;
  const guest: IShoppingMallGuest =
    await api.functional.shoppingMall.guests.create(connection, {
      body: createBody,
    });
  typia.assert(guest);

  // Prepare update data
  const updateBody = {
    session_token: RandomGenerator.alphaNumeric(32),
    ip_address: `${RandomGenerator.alphabets(4)}.updated.com`,
    user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  } satisfies IShoppingMallGuest.IUpdate;

  // Update the guest session
  const updated: IShoppingMallGuest =
    await api.functional.shoppingMall.guests.update(connection, {
      id: guest.id,
      body: updateBody,
    });
  typia.assert(updated);

  // Validate updated properties
  TestValidator.equals(
    "session_token updated correctly",
    updated.session_token,
    updateBody.session_token,
  );
  TestValidator.equals(
    "ip_address updated correctly",
    updated.ip_address ?? null,
    updateBody.ip_address ?? null,
  );
  TestValidator.equals(
    "user_agent updated correctly",
    updated.user_agent ?? null,
    updateBody.user_agent ?? null,
  );

  // Re-fetch updated guest session to verify persistence
  // Since no specific GET API for guest by ID exists, assume update response is current
  // So just confirm timestamps changed accordingly
  TestValidator.predicate(
    "updated_at is later than or equal to created_at",
    new Date(updated.updated_at) >= new Date(updated.created_at),
  );
}
