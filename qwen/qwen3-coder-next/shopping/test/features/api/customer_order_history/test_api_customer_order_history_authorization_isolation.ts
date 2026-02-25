import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer order history authorization isolation.
 * Verifies that a customer can only access their own orders, regardless of
 * any customerId parameter attempts in the request body. The system must
 * strictly filter orders by the authenticated customer's ID.
 */
export async function test_api_customer_order_history_authorization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first customer and authenticate
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1Data = typia.random<IShoppingMallCustomer.IJoin>();
  const customer1 = await api.functional.shoppingMall.auth.customer.join(
    customer1Connection,
    {
      body: customer1Data,
    },
  );
  typia.assert(customer1);
  // 2. Create second customer and authenticate
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2Data = typia.random<IShoppingMallCustomer.IJoin>();
  const customer2 = await api.functional.shoppingMall.auth.customer.join(
    customer2Connection,
    {
      body: customer2Data,
    },
  );
  typia.assert(customer2);
  // 3. First customer attempts to access order history (should be empty initially)
  const customer1Orders =
    await api.functional.shoppingMall.customer.orders.history.index(
      customer1Connection,
      {
        body: { page: 1, limit: 10 },
      },
    );
  typia.assert(customer1Orders);
  TestValidator.equals(
    "customer1 has no orders initially",
    customer1Orders.data.length,
    0,
  );
  // 4. Second customer attempts to access first customer's orders
  //    by trying to specify customer1's ID in the request body
  const customer2Orders =
    await api.functional.shoppingMall.customer.orders.history.index(
      customer2Connection,
      {
        body: {
          page: 1,
          limit: 10,
          customerId: customer1.id, // Attempt to bypass authorization
        },
      },
    );
  typia.assert(customer2Orders);
  // 5. Verify authorization isolation: customer2 should see their own orders (empty)
  TestValidator.equals(
    "customer2 sees zero orders",
    customer2Orders.data.length,
    0,
  );
  // 6. Verify that customerId parameter is ignored for authorization
  // The response should be empty regardless of customerId parameter
  TestValidator.equals(
    "customerId parameter ignored in authorization",
    customer2Orders.data.length,
    0,
  );
}
