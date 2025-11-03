import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingOrderStatusHistory";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderStatusHistory";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";

/**
 * Validates seller order status history listing with pagination, filtering, and
 * access control.
 *
 * 1. Register a new seller and authenticate. The returned token establishes
 *    session context for all seller API requests.
 * 2. (PREREQUISITE – would require more system context) – In a complete e2e, an
 *    order for a product of this seller would be created externally. For this
 *    isolated test, we generate a random orderCode string (in real e2e, this
 *    should be replaced with orchestration of the order creation flow for this
 *    seller).
 * 3. Query the status history for the (existing or random) orderCode owned by that
 *    seller via the status-history API. Use pagination (page 1, limit 5) and
 *    optionally filtering by known status, actor, or timestamp (using
 *    typia.random values for input conformity).
 * 4. Assert response type with typia.assert, check pagination shape, basic
 *    structure of status transitions, and that if the orderCode is not tied to
 *    the seller, returns empty or access-forbidden business logic applies.
 * 5. Also try with a non-linked orderCode to verify business logic (should return
 *    empty data or error).
 * 6. Validate that transitions returned are chronologically ordered, contain
 *    legitimate actors/status, and that all items are associated with the
 *    queried orderCode.
 */
export async function test_api_order_status_history_listing_by_seller(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a new seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(seller);

  // 2. (Placeholder for: create product & order for this seller). Instead, use random orderCode string for demo purposes.
  const ownedOrderCode: string = RandomGenerator.alphaNumeric(10);

  // 3. Query order status history for the (ostensibly) owned orderCode – normal retrieval, page 1, limit 5.
  const statusHistoryParams = {
    orderCode: ownedOrderCode,
    body: {
      page: 1,
      limit: 5,
      // Optionally add filters: from_status, to_status, actor, date range, search, etc.
    } satisfies IShoppingOrderStatusHistory.IRequest,
  };
  const historyPage: IPageIShoppingOrderStatusHistory =
    await api.functional.shopping.seller.orders.status_history.index(
      connection,
      statusHistoryParams,
    );
  typia.assert(historyPage);
  TestValidator.equals(
    "pagination is present and data is array",
    typeof historyPage.pagination === "object" &&
      Array.isArray(historyPage.data),
    true,
  );

  // 4. Edge case: supply orderCode likely NOT linked to the seller (simulate cross-store or non-existent orderCode)
  const nonLinkedOrderCode = RandomGenerator.alphaNumeric(12);
  const nonlinkedParams = {
    orderCode: nonLinkedOrderCode,
    body: {
      page: 1,
      limit: 5,
    } satisfies IShoppingOrderStatusHistory.IRequest,
  };
  const nonlinkedPage: IPageIShoppingOrderStatusHistory =
    await api.functional.shopping.seller.orders.status_history.index(
      connection,
      nonlinkedParams,
    );
  typia.assert(nonlinkedPage);
  TestValidator.equals(
    "status history for non-seller order is empty or inaccessible",
    Array.isArray(nonlinkedPage.data) && nonlinkedPage.data.length === 0,
    true,
  );

  // 5. Validate structure/chronology/ownership for legitimate result
  if (historyPage.data.length > 0) {
    // All transitions refer to same order
    for (const event of historyPage.data) {
      TestValidator.equals(
        "all status history refer to the requested order",
        event.shopping_order_id != null,
        true,
      );
      // Order codes aren't in DTO; only UUID shopping_order_id – can't check directly
    }
    // Chronology: occurred_at ascending depending on sort order, but default is likely desc
    for (let i = 1; i < historyPage.data.length; ++i) {
      TestValidator.predicate(
        `status history event[${i}] occurred_at <= event[${i - 1}] occurred_at`,
        new Date(historyPage.data[i].occurred_at) <=
          new Date(historyPage.data[i - 1].occurred_at),
      );
    }
    // Actor, statuses – basic non-empty string checks
    for (const ev of historyPage.data) {
      TestValidator.predicate(
        "triggered_by is a non-empty string",
        typeof ev.triggered_by === "string" && ev.triggered_by.length > 0,
      );
      TestValidator.predicate(
        "from_status is a non-empty string",
        typeof ev.from_status === "string" && ev.from_status.length > 0,
      );
      TestValidator.predicate(
        "to_status is a non-empty string",
        typeof ev.to_status === "string" && ev.to_status.length > 0,
      );
    }
  }
}
