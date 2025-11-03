import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderStatusHistory";

/**
 * Validate that an authenticated platform admin is prevented from accessing or
 * discovering order status history events using invalid or unauthorized
 * references.
 *
 * 1. Register (join) as an admin using random credentials.
 * 2. On the authenticated connection, attempt to GET an order status history event
 *    with an intentionally non-existent random order code and a valid UUID for
 *    orderStatusHistoryId.
 *
 *    - Expect the system to return an error (e.g., 404 Not Found or Forbidden), with
 *         no leakage of private or business data in the response.
 * 3. Repeat the attempt, this time using a random (syntactically valid) order code
 *    and a random UUID for orderStatusHistoryId (which does not correspond to
 *    an existing status event).
 *
 *    - Again expect the request to fail with an appropriate error response,
 *         confirming no data is disclosed beyond error state.
 */
export async function test_api_order_status_history_event_unauthorized_access_prevention(
  connection: api.IConnection,
) {
  // 1. Register as an admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "support",
      "compliance",
      "operator",
    ] as const),
    status: RandomGenerator.pick([
      "active",
      "suspended",
      "pending",
      "locked",
    ] as const),
  } satisfies IShoppingAdmin.IJoin;

  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Try to access a non-existent order status history event using random values
  await TestValidator.error(
    "admin cannot get status history with non-existent order code",
    async () => {
      await api.functional.shopping.admin.orders.status_history.at(connection, {
        orderCode: RandomGenerator.alphaNumeric(12), // unlikely to exist
        orderStatusHistoryId: typia.random<string & tags.Format<"uuid">>(), // random event id
      });
    },
  );

  // 3. Try to access another non-existent (randomized) status history id
  await TestValidator.error(
    "admin cannot get status history with random event id",
    async () => {
      await api.functional.shopping.admin.orders.status_history.at(connection, {
        orderCode: RandomGenerator.alphaNumeric(12),
        orderStatusHistoryId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
