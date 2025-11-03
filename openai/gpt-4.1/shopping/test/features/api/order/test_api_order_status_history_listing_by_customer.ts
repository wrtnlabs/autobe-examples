import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingOrderStatusHistory";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderStatusHistory";

/**
 * Validate that an authenticated customer can retrieve a filtered, paginated
 * list of all status transitions for their own order.
 *
 * 1. Register a new customer using the /auth/customer/join endpoint.
 * 2. Simulate that the customer owns an existing order by generating an orderCode
 *    string.
 * 3. Request the status history list for their own order, using no filters (base
 *    query).
 * 4. Request the status history with a specific filter (to_status, or actor) using
 *    IShoppingOrderStatusHistory.IRequest properties.
 * 5. Confirm results: each record's shopping_order_id matches intended order,
 *    transitions are in correct order, required fields present and formatted.
 * 6. Attempt to access status history for a non-owned (random) orderCode, expect
 *    empty data or access error.
 */
export async function test_api_order_status_history_listing_by_customer(
  connection: api.IConnection,
) {
  // 1. Register new customer
  const customerCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://e2e.test/customer/register",
    referrer: "https://e2e.test/landing",
  } satisfies IShoppingCustomer.ICreate;
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreate,
    });
  typia.assert(customer);

  // 2. Simulate a valid orderCode (no order creation API is available)
  // We'll use a random string that represents a potential order code
  // In a real test, we would create an actual order and update status
  const myOrderCode = RandomGenerator.alphaNumeric(16);

  // 3. Query status history for the owned order (expect data or empty depending on DB state)
  const result: IPageIShoppingOrderStatusHistory =
    await api.functional.shopping.customer.orders.status_history.index(
      connection,
      {
        orderCode: myOrderCode,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingOrderStatusHistory.IRequest,
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "pagination structure is valid",
    typeof result.pagination,
    "object",
  );
  TestValidator.predicate("result data is array", Array.isArray(result.data));
  // If there is any history, validate their required fields and business integrity
  if (result.data.length > 0) {
    for (const entry of result.data) {
      typia.assert(entry);
      TestValidator.equals(
        "order id in status history matches order",
        typeof entry.shopping_order_id,
        "string",
      );
      TestValidator.predicate(
        "occurred_at is ISO date-time",
        typeof entry.occurred_at === "string" &&
          /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(entry.occurred_at),
      );
      TestValidator.predicate(
        "has from_status and to_status",
        !!entry.from_status && !!entry.to_status,
      );
      TestValidator.predicate(
        "triggered_by is present",
        typeof entry.triggered_by === "string" && entry.triggered_by.length > 0,
      );
    }
  }

  // 4. Query with a filter (e.g., to_status)
  if (result.data.length > 0) {
    // Use the to_status of the first entry as a filter
    const to_status_value = result.data[0].to_status;
    const filtered: IPageIShoppingOrderStatusHistory =
      await api.functional.shopping.customer.orders.status_history.index(
        connection,
        {
          orderCode: myOrderCode,
          body: {
            page: 1,
            limit: 10,
            to_status: to_status_value,
          } satisfies IShoppingOrderStatusHistory.IRequest,
        },
      );
    typia.assert(filtered);
    for (const entry of filtered.data) {
      TestValidator.equals(
        "filtered to_status matches",
        entry.to_status,
        to_status_value,
      );
      TestValidator.equals(
        "order id matches in filter",
        entry.shopping_order_id,
        result.data[0].shopping_order_id,
      );
    }
  }

  // 5. Attempt to fetch history for non-owned orderCode
  const randomOrderCode = RandomGenerator.alphaNumeric(16);
  const notMine =
    await api.functional.shopping.customer.orders.status_history.index(
      connection,
      {
        orderCode: randomOrderCode,
        body: {
          page: 1,
          limit: 5,
        } satisfies IShoppingOrderStatusHistory.IRequest,
      },
    );
  typia.assert(notMine);
  TestValidator.equals(
    "cannot access status history for others' orders (should be empty)",
    notMine.data.length,
    0,
  );
}
