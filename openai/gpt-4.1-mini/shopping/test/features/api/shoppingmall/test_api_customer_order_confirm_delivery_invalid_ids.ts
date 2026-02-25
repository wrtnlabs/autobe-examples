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

export async function test_api_customer_order_confirm_delivery_invalid_ids(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Customer tries to confirm delivery using invalid orderId and shipmentId
  // Expected behavior: API should respond with appropriate error (e.g., Not Found)
  // Prepare a customer connection and authorize by customer join
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  customerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Generate invalid UUIDs for orderId and shipmentId
  const invalidOrderId = typia.random<string & tags.Format<"uuid">>();
  const invalidShipmentId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to confirm delivery with invalid order and shipment IDs
  await TestValidator.error(
    "confirm delivery with invalid orderId should throw error",
    async () => {
      await api.functional.shoppingMall.customer.orders.confirm_delivery.confirmDelivery(
        customerConnection,
        { orderId: invalidOrderId, shipmentId: invalidShipmentId },
      );
    },
  );
}
