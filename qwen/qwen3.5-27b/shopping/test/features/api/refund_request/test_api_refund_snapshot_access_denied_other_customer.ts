import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundSnapshot";
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
import { generate_random_shopping_mall_customer_customers_me_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_cart_items_create";
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { generate_random_shopping_mall_seller_sellers_me_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_shipments_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that a customer is denied access when attempting to view a refund snapshot
 * belonging to another customer's refund request.
 *
 * This test verifies the authorization boundary between customers by:
 * 1. Creating two separate customer accounts (Customer A and Customer B)
 * 2. Having Customer B complete a full purchase and refund workflow
 * 3. Attempting Customer A to access Customer B's refund snapshot
 * 4. Verifying that unauthorized access is properly denied with 403 Forbidden
 */
export async function test_api_refund_snapshot_access_denied_other_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Customer A (who will attempt unauthorized access)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: "https://example.com/login",
      referrer: "https://example.com",
    },
  });
  typia.assert(customerA);
  // 2. Register and authenticate Customer B (who will create the refund request)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: "https://example.com/login",
      referrer: "https://example.com",
    },
  });
  typia.assert(customerB);
  // 3. Register and authenticate a seller (who will ship and respond to refund)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(2),
      href: "https://example.com/login",
      referrer: "https://example.com",
    },
  });
  typia.assert(seller);
  // 4. Customer B adds a product variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerBConnection,
      {},
    );
  typia.assert(cartItem);
  // 5. Customer B places an order from cart
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerBConnection,
      {},
    );
  typia.assert(order);
  // 6. Seller creates shipment for Customer B's order items
  const shipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: order.orderItems.map((item) => item.id),
          tracking_carrier: "FedEx",
          tracking_number: RandomGenerator.alphaNumeric(20),
        },
      },
    );
  typia.assert(shipment);
  // 7. Customer B confirms delivery to enable refund window
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerBConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 8. Customer B creates a refund request for delivered item
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerBConnection,
      {
        body: {
          orderItemId: order.orderItems[0].id,
          reason: "Product arrived damaged",
        },
      },
    );
  typia.assert(refundRequest);
  // 9. Seller responds to Customer B's refund request (creating a snapshot)
  const updatedRefundRequest =
    await api.functional.shoppingMall.seller.refund_requests.update(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallRefundRequest.IUpdate,
      },
    );
  typia.assert(updatedRefundRequest);
  // 10. Generate a valid-looking snapshot ID for the access attempt
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 11. Customer A attempts to access Customer B's refund snapshot (should be denied)
  // Verify that the system returns 403 Forbidden (authorization error) or 404 Not Found
  await TestValidator.httpError(
    "Customer A cannot access Customer B's refund snapshot",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.customer.refund_requests.snapshots.at(
        customerAConnection,
        {
          refundRequestId: refundRequest.id,
          snapshotId: snapshotId,
        },
      );
    },
  );
}
