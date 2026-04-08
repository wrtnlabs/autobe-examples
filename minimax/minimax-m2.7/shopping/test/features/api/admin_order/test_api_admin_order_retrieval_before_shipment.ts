import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_order_retrieval_before_shipment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason:
        "Testing admin order retrieval functionality for platform oversight and management",
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000/",
    },
  });
  typia.assert(adminAuth);
  // 2. Create authenticated admin connection with the token
  const authenticatedAdminConnection: api.IConnection = {
    host: connection.host,
  };
  authenticatedAdminConnection.headers ??= {};
  authenticatedAdminConnection.headers.Authorization = adminAuth.token.access;
  // 3. Admin retrieves order details - using simulation mode with random UUID
  // In real integration tests, this would be a pre-created order ID
  const simulatedConnection: api.IConnection = {
    ...authenticatedAdminConnection,
    simulate: true,
  };
  const adminOrder = await api.functional.ecommerceMall.admin.orders.at(
    simulatedConnection,
    {
      orderId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(adminOrder);
  // 4. Validate order has expected structure for pre-shipment state
  TestValidator.equals("order status is paid", adminOrder.status, "paid");
  TestValidator.predicate("order has items", adminOrder.orderItems.length > 0);
  TestValidator.equals(
    "all order items have paid status",
    adminOrder.orderItems.every((item) => item.status === "paid"),
    true,
  );
  TestValidator.equals(
    "shipments array is empty",
    adminOrder.shipments.length,
    0,
  );
  TestValidator.predicate("order has id", (adminOrder.id?.length ?? 0) > 0);
  TestValidator.predicate(
    "order has order number",
    (adminOrder.orderNumber?.length ?? 0) > 0,
  );
  TestValidator.predicate(
    "order has customer info",
    adminOrder.customer !== undefined && adminOrder.customer !== null,
  );
  TestValidator.predicate(
    "order has shipping address",
    adminOrder.shippingAddress !== undefined &&
      adminOrder.shippingAddress !== null,
  );
}
