import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_item_at(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Authorized customer can retrieve order item details
  // Scenario 2: Unauthorized customer access is denied
  // Scenario 3: Retrieval of non-existing order item returns not found error
  // 1. Authorize first customer (owner)
  const customerConnection1: api.IConnection = { host: connection.host };
  const customerAuth1 = await authorize_customer_join(customerConnection1, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  typia.assert(customerAuth1);
  customerConnection1.headers = { Authorization: customerAuth1.token.access };
  // In a real test environment, a pre-existing order with order items
  // belonging to customer 1 should be used or created here.
  // Since this information is not provided, we simulate the usage
  // by generating random IDs that supposedly belong to the customer.
  // Using realistic UUIDs for orderId and orderItemId
  const validOrderId = typia.random<string & tags.Format<"uuid">>();
  const validOrderItemId = typia.random<string & tags.Format<"uuid">>();
  // 2. Scenario 1: Retrieve order item with valid credentials
  const orderItem1 = await api.functional.shoppingMall.customer.orders.items.at(
    customerConnection1,
    {
      orderId: validOrderId,
      orderItemId: validOrderItemId,
    },
  );
  typia.assert(orderItem1);
  // Additional verification can be added here if schema details were present
  // 3. Authorize second customer (non-owner)
  const customerConnection2: api.IConnection = { host: connection.host };
  const customerAuth2 = await authorize_customer_join(customerConnection2, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  typia.assert(customerAuth2);
  customerConnection2.headers = { Authorization: customerAuth2.token.access };
  // 4. Scenario 2: Non-owner customer attempts to access order item and gets forbidden
  await TestValidator.httpError("unauthorized access denied", 403, async () => {
    await api.functional.shoppingMall.customer.orders.items.at(
      customerConnection2,
      {
        orderId: validOrderId,
        orderItemId: validOrderItemId,
      },
    );
  });
  // 5. Scenario 3: Customer attempts to access non-existent order item
  // Using another UUID that hopefully does not exist
  const nonExistentOrderId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentOrderItemId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "nonexistent order item not found",
    404,
    async () => {
      await api.functional.shoppingMall.customer.orders.items.at(
        customerConnection1,
        {
          orderId: nonExistentOrderId,
          orderItemId: nonExistentOrderItemId,
        },
      );
    },
  );
}
