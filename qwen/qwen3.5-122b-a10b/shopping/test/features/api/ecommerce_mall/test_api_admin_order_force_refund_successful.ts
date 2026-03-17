import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator force-refund an entire order successfully.
 *
 * This test validates that an administrator can successfully force-refund
 * an entire order through administrative override, bypassing normal refund
 * eligibility requirements. The test verifies:
 * 1. Administrator authentication via admin join
 * 2. Force-refund endpoint execution with valid order ID and reason
 * 3. Response type validation (IEcommerceMallOrder)
 * 4. All order items updated to 'refunded' status
 * 5. Order status updated to 'refunded'
 */
export async function test_api_admin_order_force_refund_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        typia.random<string & tags.Format<"email">>(),
      ),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Call force-refund endpoint with valid order ID and reason
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const reason: string & tags.MinLength<1> & tags.MaxLength<1000> =
    RandomGenerator.paragraph({ sentences: 3 });
  const order: IEcommerceMallOrder =
    await api.functional.ecommerceMall.admin.orders.force_refund.forceRefund(
      adminConnection,
      {
        orderId,
        body: { reason } satisfies IEcommerceMallOrder.IForceRefund,
      },
    );
  typia.assert(order);
  // 3. Verify order status is 'refunded'
  TestValidator.equals("order status is refunded", order.status, "refunded");
  // 4. Verify all order items are updated to 'refunded' status
  TestValidator.predicate(
    "all order items are refunded",
    order.order_items.every((item) => item.status === "refunded"),
  );
  // 5. Verify order has order items
  TestValidator.predicate("order has items", order.order_items.length > 0);
  // 6. Verify order contains required fields
  TestValidator.predicate("order has valid ID", order.id !== undefined);
  TestValidator.predicate(
    "order has valid order number",
    order.order_number !== undefined,
  );
  TestValidator.predicate(
    "order has total price",
    order.total_price !== undefined,
  );
  TestValidator.predicate("order has customer", order.customer !== undefined);
  TestValidator.predicate("order has shipments", order.shipments !== undefined);
}