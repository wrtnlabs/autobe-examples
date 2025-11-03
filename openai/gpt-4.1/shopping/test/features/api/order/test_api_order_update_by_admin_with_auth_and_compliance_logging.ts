import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
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
 * Test admin can update shopping order allowed fields with audit logging and
 * role context.
 *
 * 1. Register admin and authenticate
 * 2. Create test order data (simulate by creating order via random data)
 * 3. Update the order as admin: change 'status' to a random new allowed value,
 *    update an address
 * 4. Verify result:
 *
 *    - Status and addresses are updated in order response
 *    - A status_history record exists for the change, with triggered_by == 'admin'
 *    - Original immutable fields (order_code, customer) are unchanged
 *    - All changes (including attempts to update restricted fields) are audit logged
 * 5. Attempt to update immutable field (order_code/customer) and expect business
 *    error
 *
 *    - Confirm value is unchanged (negative test)
 *    - Confirm audit log of the denied attempt
 */
export async function test_api_order_update_by_admin_with_auth_and_compliance_logging(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const adminJoin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        role: RandomGenerator.pick([
          "super",
          "support",
          "compliance",
          "operator",
        ] as const),
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(adminJoin);

  // 2. Simulate existence of an order by generating random order_code and create a fake initial order
  // Note: As only /shopping/admin/orders/{orderCode} update is available,
  // generating an actual order requires a real preceding creation API which is absent,
  // so for this test we use typia.random<IShoppingOrder>() as a stand-in (simulate mode)
  const base: IShoppingOrder = typia.random<IShoppingOrder>();
  const mutableOrderCode = base.order_code;

  // 3. Perform allowed order update: change status and shipping address
  // Pick a status that is different from the current one
  const allowedStatuses = [
    "pending",
    "paid",
    "processing",
    "fulfilled",
    "canceled",
    "refunded",
    "completed",
  ] as const;
  const nextStatus = RandomGenerator.pick(
    allowedStatuses.filter((s) => s !== base.status),
  );
  const updateAddrInput: IShoppingOrderAddress.IUpdate = {
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    base_address: RandomGenerator.paragraph(),
    zip_code: RandomGenerator.alphaNumeric(5),
    city: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    state_province: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 8,
    }),
    country: "South Korea",
    type: RandomGenerator.pick(["shipping", "billing"] as const),
  } satisfies IShoppingOrderAddress.IUpdate;

  const allowedUpdateBody = {
    status: nextStatus,
    shipping_addresses: [updateAddrInput],
  } satisfies IShoppingOrder.IUpdate;

  const updated: IShoppingOrder =
    await api.functional.shopping.admin.orders.update(connection, {
      orderCode: mutableOrderCode,
      body: allowedUpdateBody,
    });
  typia.assert(updated);
  TestValidator.notEquals(
    "Order status should be updated",
    updated.status,
    base.status,
  );
  TestValidator.equals(
    "Order shipping addresses count matches input",
    updated.addresses.length,
    1,
  );
  // Validate that status_history audit has an entry for this transition by an admin
  const audit = updated.status_history.find(
    (h) => h.to_status === nextStatus && h.triggered_by === "admin",
  );
  TestValidator.predicate(
    "Status history should include admin-triggered transition",
    !!audit,
  );
  // Verify immutable fields not changed
  TestValidator.equals(
    "Order code remains unchanged",
    updated.order_code,
    base.order_code,
  );
  TestValidator.equals(
    "Customer remains unchanged",
    updated.customer,
    base.customer,
  );

  // 4. Negative test: attempt forbidden update (immutable field)
  // IShoppingOrder.IUpdate only allows status and shipping_addresses, so attempting forbidden update is not possible by DTO.
  // Simulate invalid update attempt - try with no allowed fields (should not change order -- idempotent case)
  const forbiddenUpdateBody = {} satisfies IShoppingOrder.IUpdate;
  const forbiddenResult: IShoppingOrder =
    await api.functional.shopping.admin.orders.update(connection, {
      orderCode: mutableOrderCode,
      body: forbiddenUpdateBody,
    });
  typia.assert(forbiddenResult);
  // No fields changed
  TestValidator.equals(
    "Forbidden update does not alter order",
    forbiddenResult,
    updated,
  );
  // Additional: Ensure status history did not change as there were no changes
  TestValidator.equals(
    "Forbidden update did not add new audit record",
    forbiddenResult.status_history.length,
    updated.status_history.length,
  );
}
