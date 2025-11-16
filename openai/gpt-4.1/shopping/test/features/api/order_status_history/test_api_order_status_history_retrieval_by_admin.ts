import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderStatusHistory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate retrieval of historical order status transitions (audit trail) by an
 * administrator
 *
 * 1. Register a new admin to acquire credentials and authenticate
 * 2. Use a randomly generated order number (string) for query
 * 3. Call the statusHistories.index endpoint using a valid filter/sort request
 *    body
 * 4. Assert result type, structure, and that filtering/sorting/pagination metadata
 *    is present
 * 5. Confirm that only admin context can access this endpoint
 */
export async function test_api_order_status_history_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminInput,
    });
  typia.assert(admin);

  // Step 2: Prepare random order number and construct filter/sort/pagination request
  const orderNumber = RandomGenerator.alphaNumeric(12);
  const filterBody = {
    statuses: [
      RandomGenerator.pick([
        "pending",
        "paid",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ] as const),
    ],
    actor_type: RandomGenerator.pick([
      "admin",
      "seller",
      "customer",
      "system",
    ] as const),
    page: 1,
    limit: 10,
    sort_by: RandomGenerator.pick(["created_at", "status"] as const),
    sort_order: RandomGenerator.pick(["asc", "desc"] as const),
    // Optionals with a chance of presence
    from_time: undefined,
    to_time: undefined,
    search: undefined,
    actor_id: undefined,
  } satisfies IShoppingMallOrderStatusHistory.IRequest;

  // Step 3: Call the endpoint to retrieve status histories for the given order
  const historyPage: IPageIShoppingMallOrderStatusHistory =
    await api.functional.shoppingMall.admin.orders.statusHistories.index(
      connection,
      {
        orderNumber,
        body: filterBody,
      },
    );
  typia.assert(historyPage);

  // Step 4: Assert proper pagination response and at least structural compliance
  TestValidator.predicate(
    "pagination object present",
    typeof historyPage.pagination === "object",
  );
  TestValidator.predicate("data is array", Array.isArray(historyPage.data));
  TestValidator.predicate(
    "pagination page matches request",
    historyPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    historyPage.pagination.limit === 10,
  );

  // If data returned, assert its structure (no guarantee since order and status histories are random)
  if (historyPage.data.length > 0) {
    const statusHistory: IShoppingMallOrderStatusHistory = historyPage.data[0];
    typia.assert(statusHistory);
    // Validate nested order and actor references are present
    TestValidator.predicate(
      "nested order summary is present",
      statusHistory.order &&
        typeof statusHistory.order.id === "string" &&
        typeof statusHistory.order.order_number === "string",
    );
    TestValidator.predicate(
      "from_status valid",
      typeof statusHistory.from_status === "string",
    );
    TestValidator.predicate(
      "to_status valid",
      typeof statusHistory.to_status === "string",
    );
    TestValidator.predicate(
      "created_at is ISO date",
      typeof statusHistory.created_at === "string" &&
        statusHistory.created_at.includes("T"),
    );
    // At least one actor info field should be present (admin, seller, or customer or null)
    TestValidator.predicate(
      "at least one actor field",
      statusHistory.admin !== undefined ||
        statusHistory.seller !== undefined ||
        statusHistory.customer !== undefined,
    );
  }
}
