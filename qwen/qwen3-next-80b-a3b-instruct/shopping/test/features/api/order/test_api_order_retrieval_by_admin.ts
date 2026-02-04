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
export async function test_api_order_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // Step 2: Create customer connection and register
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Step 3: Login as customer to create an order using the stored email
  const customerLoggedConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoggedConnection, {
    body: {
      email: customerEmail, // Use the stored email from Step 2
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // Step 4: Create a random order via customer
  const order: IShoppingMallOrder =
    await generate_random_shopping_mall_customer_orders_create(
      customerLoggedConnection,
      {},
    );
  typia.assert(order);
  // Step 5: Admin retrieves the order
  const retrievedOrder: IShoppingMallOrder =
    await api.functional.shoppingMall.admin.orders.at(adminConnection, {
      orderId: order.id,
    });
  typia.assert(retrievedOrder);
  // Step 6: Validate that admin can retrieve customer's order
  TestValidator.equals(
    "admin retrieved expected order",
    retrievedOrder.id,
    order.id,
  );
  TestValidator.equals(
    "admin retrieved order with correct customer ID",
    retrievedOrder.customerId,
    order.customerId,
  );
  TestValidator.equals(
    "retrieved order contains order items",
    Boolean(retrievedOrder.orderItems),
    true,
  );
  TestValidator.equals(
    "retrieved order contains shipments",
    Boolean(retrievedOrder.shipments),
    true,
  );
  TestValidator.equals(
    "retrieved order contains shipping address",
    Boolean(retrievedOrder.shippingAddress),
    true,
  );
}
