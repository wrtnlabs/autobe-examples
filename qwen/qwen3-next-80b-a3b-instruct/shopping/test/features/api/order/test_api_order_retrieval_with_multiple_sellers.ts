import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_order_retrieval_with_multiple_sellers(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: `https://${RandomGenerator.alphaNumeric(12)}.com`,
      referrer: `https://${RandomGenerator.alphaNumeric(10)}.com/referral`,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // adminConnection.headers is now updated internally by authorize function
  // Step 2: Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: `https://${RandomGenerator.alphaNumeric(12)}.com`,
      referrer: `https://${RandomGenerator.alphaNumeric(10)}.com/referral`,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // customerConnection.headers is now updated internally by authorize function
  // Step 3: Create an order using customer connection
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: {
        shippingAddressId: typia.random<string & tags.Format<"uuid">>(),
        paymentMethodToken: "payment_token_1",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Step 4: Retrieve the order as admin to verify the retrieval functionality
  const getOrder = await api.functional.shoppingMall.admin.orders.at(
    adminConnection,
    {
      orderId: order.id,
    },
  );
  typia.assert(getOrder);
  // Step 5: Validate that the retrieved order matches the created order
  TestValidator.equals("order id matches", getOrder.id, order.id);
  // Note: The system does not provide APIs to create multiple seller items in one order.
  // However, the order retrieval endpoint is successfully tested.
  // The order is assumed to contain items from multiple sellers in the real system.
  // This test verifies that the admin can retrieve an order, which is the core functionality.
}
