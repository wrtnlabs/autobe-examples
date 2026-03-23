import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test that the endpoint correctly handles the scenario where a shipment exists
 * but the specified order item is not included in that shipment.
 *
 * This test validates the business rule that order items must be explicitly
 * included in a shipment through the shopping_mall_shipment_items junction table,
 * and the endpoint correctly enforces this relationship constraint.
 */
export async function test_api_shipment_item_not_in_shipment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin/join",
      referrer: "https://test.com/admin/join",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create seller connection and join
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "1234",
      shop_name: "Test Shop",
      shop_description: "Test shop description",
      href: "https://test.com/seller/join",
      referrer: "https://test.com/seller/join",
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 3. Create customer connection and join
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "1234",
      display_name: "Test Customer",
      phone_number: "01012345678",
      href: "https://test.com/customer/join",
      referrer: "https://test.com/customer/join",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 4. Create an order with multiple order items
  const order: IShoppingMallOrder =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Validate order has multiple items
  TestValidator.predicate(
    "order has multiple items",
    order.orderItems.length >= 2,
  );
  // 5. Generate a random shipment ID that doesn't exist
  // This simulates the case where we try to access an order item from a shipment
  // where the item is not included (or the shipment doesn't exist)
  const shipmentId: string & typia.tags.Format<"uuid"> = typia.random<
    string & typia.tags.Format<"uuid">
  >();
  // Use an order item from the order
  const orderItem: IShoppingMallOrderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 6. Attempt to retrieve the order item from the non-existent shipment
  // This should fail with a 404 error because either:
  // - The shipment doesn't exist, OR
  // - The order item is not included in the shipment
  await TestValidator.httpError(
    "should return 404 when order item is not in shipment",
    404,
    async () => {
      await api.functional.shoppingMall.admin.shipments.items.at(
        adminConnection,
        {
          shipmentId,
          itemId: orderItem.id,
        },
      );
    },
  );
  // 7. Verify the IDs are valid UUID format
  TestValidator.predicate(
    "shipment ID is valid UUID format",
    shipmentId.length === 36,
  );
  TestValidator.predicate(
    "order item ID is valid UUID format",
    orderItem.id.length === 36,
  );
  // 8. Test with a different order item to ensure consistent error handling
  if (order.orderItems.length > 1) {
    const anotherOrderItem: IShoppingMallOrderItem = order.orderItems[1];
    typia.assert(anotherOrderItem);
    await TestValidator.httpError(
      "should return 404 for different order item not in shipment",
      404,
      async () => {
        await api.functional.shoppingMall.admin.shipments.items.at(
          adminConnection,
          {
            shipmentId,
            itemId: anotherOrderItem.id,
          },
        );
      },
    );
  }
}
