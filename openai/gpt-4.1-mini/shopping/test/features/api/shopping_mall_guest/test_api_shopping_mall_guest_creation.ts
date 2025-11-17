import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

export async function test_api_shopping_mall_guest_creation(
  connection: api.IConnection,
) {
  // Create a new guest user record with empty creation body as per IShoppingMallGuest.ICreate
  const guest: IShoppingMallGuest =
    await api.functional.shoppingMall.shoppingMallGuests.create(connection, {
      body: {} satisfies IShoppingMallGuest.ICreate,
    });
  // Validate the response type and existence of required properties
  typia.assert(guest);
  // Check that 'id' is a valid UUID
  TestValidator.predicate(
    "guest id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      guest.id,
    ),
  );
  // Check that created_at and updated_at are valid ISO 8601 date-time strings
  TestValidator.predicate(
    "created_at is ISO 8601 date-time",
    typeof guest.created_at === "string" &&
      !isNaN(Date.parse(guest.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 date-time",
    typeof guest.updated_at === "string" &&
      !isNaN(Date.parse(guest.updated_at)),
  );
}
