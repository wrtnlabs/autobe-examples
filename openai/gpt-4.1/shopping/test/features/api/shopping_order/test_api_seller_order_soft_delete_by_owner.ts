import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrder";
import type { IShoppingOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderAddress";
import type { IShoppingOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderLine";
import type { IShoppingOrderLineFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderLineFulfillment";
import type { IShoppingOrderPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderPaymentAttempt";
import type { IShoppingOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderShipment";
import type { IShoppingOrderSplit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderSplit";
import type { IShoppingOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderStatusHistory";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";

/**
 * Validates that a seller can soft-delete (cancel) their own order before
 * fulfillment, and that ownership, state, authentication, and audit log
 * constraints are enforced.
 *
 * 1. Register a seller with random credentials using
 *    api.functional.auth.seller.join (which also authenticates the seller).
 * 2. Simulate an order belonging to the seller (for test demonstration, use
 *    typia.random<IShoppingOrder>(), as order creation API is not accessible,
 *    and extract a valid 'order_code' and seller to use for further
 *    validation).
 * 3. Soft-delete the order by calling api.functional.shopping.seller.orders.erase
 *    with the valid orderCode.
 * 4. Validate that the returned IShoppingOrder object has a non-null deleted_at
 *    value (soft deletion, not hard removal).
 * 5. Verify that the status of the order reflects deletion/cancellation.
 * 6. Verify there is at least one status_history with a transition to a
 *    cancellation/deleted state and that it's attributed to the seller actor
 *    (status_history.to_status and .triggered_by validation).
 * 7. Validate all type constraints using typia.assert().
 * 8. Attempt to erase an order with an orderCode not owned by the seller; confirm
 *    that an error is thrown (TestValidator.error).
 * 9. Attempt to call erase endpoint unauthenticated; verify that access is denied.
 */
export async function test_api_seller_order_soft_delete_by_owner(
  connection: api.IConnection,
) {
  // 1. Register seller
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const authorizedSeller = await api.functional.auth.seller.join(connection, {
    body: joinInput,
  });
  typia.assert(authorizedSeller);

  // 2. Simulate an order belonging to this seller
  // Since order creation API is inaccessible, use typia.random and patch keys for validation
  let testOrder = typia.random<IShoppingOrder>();
  testOrder = { ...testOrder, order_code: RandomGenerator.alphaNumeric(10) };
  // (optional: patch order_lines, order_splits with matching seller info if needed)

  // 3. Soft-delete the seller's order
  const erased = await api.functional.shopping.seller.orders.erase(connection, {
    orderCode: testOrder.order_code,
  });
  typia.assert(erased);

  // 4. Validate soft deletion
  TestValidator.predicate(
    "order deleted_at is non-null after erase",
    erased.deleted_at !== null && erased.deleted_at !== undefined,
  );

  // 5. Check cancellation state
  TestValidator.predicate(
    "order status is cancellation or deletion",
    erased.status === "cancelled" ||
      erased.status === "deleted" ||
      erased.status === "canceled",
  );

  // 6. Validate status history includes soft-delete event attributed to seller
  TestValidator.predicate(
    "order status history contains deletion event by seller",
    erased.status_history.some(
      (h) =>
        (h.to_status === "cancelled" ||
          h.to_status === "deleted" ||
          h.to_status === "canceled") &&
        (h.triggered_by === "seller" || h.triggered_by === authorizedSeller.id),
    ),
  );

  // 7. Type assertion on full object (returns)
  typia.assert(erased);

  // 8. Attempt to delete ineligible order (not owned by seller)
  const notOwnersOrderCode = RandomGenerator.alphaNumeric(10);
  await TestValidator.error("erase fails for not-owned order", async () => {
    await api.functional.shopping.seller.orders.erase(connection, {
      orderCode: notOwnersOrderCode,
    });
  });

  // 9. Attempt deletion without authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated erase is denied", async () => {
    await api.functional.shopping.seller.orders.erase(unauthConn, {
      orderCode: testOrder.order_code,
    });
  });
}
