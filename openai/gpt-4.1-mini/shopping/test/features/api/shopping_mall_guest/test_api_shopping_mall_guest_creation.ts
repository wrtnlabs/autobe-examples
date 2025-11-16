import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

export async function test_api_shopping_mall_guest_creation(
  connection: api.IConnection,
) {
  // 1. Prepare the guest creation request body
  const requestBody = {
    session_id: RandomGenerator.alphaNumeric(20),
    device_info: `Browser XYZ on OS ${RandomGenerator.alphaNumeric(5)}`,
    ip_address: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallGuest.ICreate;

  // 2. Call the create guest API endpoint
  const guest: IShoppingMallGuest =
    await api.functional.shoppingMall.guests.create(connection, {
      body: requestBody,
    });

  // 3. Use typia to assert the guest response data structure
  typia.assert(guest);

  // 4. Additional checks for required fields
  TestValidator.predicate(
    "guest id format is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      guest.id,
    ),
  );

  TestValidator.predicate(
    "guest created_at is ISO date-time string",
    typeof guest.created_at === "string" &&
      !Number.isNaN(Date.parse(guest.created_at)),
  );

  TestValidator.predicate(
    "guest updated_at is ISO date-time string",
    typeof guest.updated_at === "string" &&
      !Number.isNaN(Date.parse(guest.updated_at)),
  );

  TestValidator.predicate(
    "guest deleted_at is null or undefined",
    guest.deleted_at === null || guest.deleted_at === undefined,
  );
}
