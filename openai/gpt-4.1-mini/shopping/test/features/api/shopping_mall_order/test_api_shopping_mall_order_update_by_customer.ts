import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";

export async function test_api_shopping_mall_order_update_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer join and authentication
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongP@ssw0rd",
    full_name: "John Doe",
    href: "https://example.com/signup",
    referrer: "https://example.com",
  } satisfies IShoppingMallCustomer.ICreate;
  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerData,
    });
  typia.assert(authorizedCustomer);

  // 2. Create new shopping mall order
  const createOrderBody = {
    order_number: `ORD-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
    status: "pending",
    payment_status: "pending",
    total_amount: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<1000000>
    >(),
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.shoppingMallOrders.create(
      connection,
      {
        body: createOrderBody,
      },
    );
  typia.assert(order);

  // 3. Update the order with modifiable fields
  const updateOrderBody: IShoppingMallOrder.IUpdate = {
    status: "processing",
    payment_status: "paid",
    total_amount: order.total_amount + 1000,
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  const updatedOrder: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.shoppingMallOrders.update(
      connection,
      {
        orderId: order.id,
        body: updateOrderBody,
      },
    );
  typia.assert(updatedOrder);

  // 4. Validate that the update reflects the changed fields
  TestValidator.equals("order id remains unchanged", updatedOrder.id, order.id);
  TestValidator.equals(
    "order status is updated",
    updatedOrder.status,
    updateOrderBody.status,
  );
  TestValidator.equals(
    "payment status is updated",
    updatedOrder.payment_status,
    updateOrderBody.payment_status,
  );
  TestValidator.equals(
    "total amount is increased",
    updatedOrder.total_amount,
    updateOrderBody.total_amount,
  );
  TestValidator.equals(
    "updated_at timestamp is updated",
    updatedOrder.updated_at,
    updateOrderBody.updated_at,
  );
  TestValidator.equals("deleted_at is null", updatedOrder.deleted_at, null);
}
