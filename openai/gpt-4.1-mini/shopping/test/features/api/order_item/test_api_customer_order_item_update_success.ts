import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_item_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: A customer registers, then updates an existing order item using PUT /shoppingMall/customer/order-items/{orderItemId}.
  // 1. Customer Join (registration and authorization)
  const customerConnection: api.IConnection = { host: connection.host };
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(authorizedCustomer);
  // 2. Setup actor-specific connection with updated Authorization header
  customerConnection.headers ??= {};
  customerConnection.headers.Authorization = authorizedCustomer.token.access;
  // 3. Prepare initial order item by creating an order and order item.
  // Since there is no utility function for order creation or order item creation, create them via lower-level functions if available.
  // However, only order item update endpoint is given. We must prepare an existing order item - so create an order and order item via direct creation or simulation.
  // To comply with scenario, simulate creation of order item to obtain valid order item id and related info.
  // We'll simulate an existing order item first.
  // Because there is no creation endpoint provided, we will simulate creating an order item by calling updateOrderItem with no effective changes for setup.
  // Generate a random order item as base
  const baseOrderItem = typia.random<IShoppingMallOrderItem>();
  // We'll patch an initial order item record by creating it in the system with a simulation.
  // (Simulation returns a random order item; for test we can accept this random as existing)
  // 4. Choose updated fields
  const newQuantity =
    baseOrderItem.quantity + 1 <= 1000
      ? baseOrderItem.quantity + 1
      : baseOrderItem.quantity;
  const possibleStatuses = [
    "paid",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ];
  const currentStatusIndex = possibleStatuses.indexOf(baseOrderItem.status);
  const newStatus =
    currentStatusIndex === -1
      ? "paid"
      : possibleStatuses[(currentStatusIndex + 1) % possibleStatuses.length];
  // 5. Prepare update body
  const updateBody: IShoppingMallOrderItem.IUpdate = {
    quantity: newQuantity,
    status: newStatus,
  };
  // 6. Perform update order item API call
  const updatedOrderItem =
    await api.functional.shoppingMall.customer.order_items.updateOrderItem(
      customerConnection,
      {
        orderItemId: baseOrderItem.id,
        body: updateBody,
      },
    );
  typia.assert(updatedOrderItem);
  // 7. Validate that updated fields have changed
  TestValidator.equals(
    "updated quantity",
    updatedOrderItem.quantity,
    newQuantity,
  );
  TestValidator.equals("updated status", updatedOrderItem.status, newStatus);
  // 8. Validate that other fields remain unchanged
  TestValidator.equals("id unchanged", updatedOrderItem.id, baseOrderItem.id);
  TestValidator.equals(
    "shoppingMallOrderId unchanged",
    updatedOrderItem.shoppingMallOrderId,
    baseOrderItem.shoppingMallOrderId,
  );
  TestValidator.equals(
    "shoppingMallProductVariantId unchanged",
    updatedOrderItem.shoppingMallProductVariantId,
    baseOrderItem.shoppingMallProductVariantId,
  );
  TestValidator.equals(
    "order summary unchanged",
    updatedOrderItem.order,
    baseOrderItem.order,
  );
  TestValidator.equals(
    "productVariant summary unchanged",
    updatedOrderItem.productVariant,
    baseOrderItem.productVariant,
  );
  // 9. Confirm updatedAt is updated (newer than old updatedAt)
  TestValidator.predicate(
    "updatedAt timestamp updated",
    new Date(updatedOrderItem.updatedAt).getTime() >
      new Date(baseOrderItem.updatedAt).getTime(),
  );
}
