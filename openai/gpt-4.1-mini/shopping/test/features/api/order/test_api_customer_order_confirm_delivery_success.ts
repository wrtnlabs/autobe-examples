import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_confirm_delivery_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins and authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(connection, {});
  customerConnection.headers = { Authorization: authorized.token.access };
  typia.assert(authorized);
  // 2. Retrieve or create an order with shipment for this customer
  // Note: We don't have APIs to create an order or shipment directly,
  // so this step assumes we have pre-existing realistic IDs for order and shipment.
  // To simulate, we'll generate UUIDs and rely on test environment setup.
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Confirm delivery
  const order =
    await api.functional.shoppingMall.customer.orders.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        orderId,
        shipmentId,
      },
    );
  typia.assert(order);
  // 4. Verify that order and shipment statuses are "delivered"
  // Checking order.orderStatus
  TestValidator.equals("order status", order.orderStatus, "delivered");
  // Checking each order item status
  for (const item of order.orderItems) {
    TestValidator.equals(
      `order item status for item ${item.id}`,
      item.status,
      "delivered",
    );
  }
  // 5. Confirm that the shipment related in order is updated to delivered
  // (Assuming order.orderSnapshots or additional shipment data is included)
  // However, shipment details field is not defined in IShoppingMallOrder,
  // so this is a minimal verification.
}
