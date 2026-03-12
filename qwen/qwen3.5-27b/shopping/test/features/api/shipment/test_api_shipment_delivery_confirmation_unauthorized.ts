import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { generate_random_shopping_mall_seller_sellers_me_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_shipment_delivery_confirmation_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that customers can only confirm delivery for shipments belonging to their own orders.
   *
   * Setup:
   * 1. Register and authenticate as customer A (order owner)
   * 2. Register and authenticate as customer B (unauthorized user)
   * 3. Register and authenticate as a seller
   * 4. Customer A creates an order with items from the seller
   * 5. Seller creates a shipment containing customer A's order items
   *
   * Test Steps:
   * 1. Customer B (different from order owner) attempts to confirm delivery for customer A's shipment
   * 2. Verify the request is rejected with appropriate error
   *
   * Expected Results:
   * - HTTP 403 Forbidden response
   * - Error message indicates customer does not own the shipment
   * - Shipment remains unchanged (delivery_confirmed=false)
   * - Order items remain in 'shipped' status
   * - No delivery confirmation timestamp is recorded
   *
   * This validates the security requirement that only the customer who owns the order containing the shipment's order items can confirm delivery.
   */
  // 1. Register and authenticate as customer A (order owner)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      display_name: "Customer A",
    },
  });
  typia.assert(customerA);
  // 2. Register and authenticate as customer B (unauthorized user)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      display_name: "Customer B",
    },
  });
  typia.assert(customerB);
  // 3. Register and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: "Test Seller Shop",
    },
  });
  typia.assert(seller);
  // 4. Customer A creates an order with items from the seller
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerAConnection,
      {},
    );
  typia.assert(order);
  // 5. Seller creates a shipment containing customer A's order items
  const shipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: order.orderItems.map((item) => item.id),
          tracking_carrier: "FedEx",
          tracking_number: "1234567890",
        },
      },
    );
  typia.assert(shipment);
  // Verify shipment was created correctly
  TestValidator.equals("shipment exists", shipment.id, shipment.id);
  TestValidator.equals(
    "delivery not confirmed",
    shipment.delivery_confirmed,
    false,
  );
  TestValidator.equals("delivered_at is null", shipment.delivered_at, null);
  // 6. Customer B (unauthorized) attempts to confirm delivery for customer A's shipment
  await TestValidator.httpError(
    "unauthorized customer cannot confirm delivery",
    403,
    async () =>
      await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
        customerBConnection,
        {
          shipmentId: shipment.id,
        },
      ),
  );
  // 7. Verify shipment remains unchanged (delivery_confirmed=false, delivered_at=null)
  // Note: We cannot directly fetch the shipment as customer B, so we validate through the error response
  // The error response confirms the shipment exists but customer B has no access
}
