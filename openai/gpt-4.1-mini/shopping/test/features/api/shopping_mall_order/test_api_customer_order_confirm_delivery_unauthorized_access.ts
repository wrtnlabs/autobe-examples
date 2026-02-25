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

export async function test_api_customer_order_confirm_delivery_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authorized customer#1
  const customerConnection1: api.IConnection = { host: connection.host };
  const customer1 = await authorize_customer_join(customerConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  typia.assert(customer1);
  customerConnection1.headers = {
    Authorization: customer1.token.access,
  };
  // 2. Create authorized customer#2 (different user, used to create order and shipment)
  const customerConnection2: api.IConnection = { host: connection.host };
  const customer2 = await authorize_customer_join(customerConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password456",
    },
  });
  typia.assert(customer2);
  customerConnection2.headers = {
    Authorization: customer2.token.access,
  };
  // 3. For this test, we must simulate an order and shipment belonging to customer#2.
  // As there's no direct utility function for order creation provided and no provided API to create orders,
  // we will simulate orderId and shipmentId with UUIDs (assuming they belong to customer#2 for unauthorized test).
  const unauthorizedOrderId = typia.random<string & tags.Format<"uuid">>();
  const unauthorizedShipmentId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to confirm delivery of customer#2's order using customer#1's connection (unauthorized)
  await TestValidator.httpError(
    "unauthorized delivery confirmation should fail",
    403, // Forbidden status code expected
    async () => {
      await api.functional.shoppingMall.customer.orders.confirm_delivery.confirmDelivery(
        customerConnection1,
        {
          orderId: unauthorizedOrderId,
          shipmentId: unauthorizedShipmentId,
        },
      );
    },
  );
}
