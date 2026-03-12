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
 * Test that a seller cannot access refund requests for order items owned by another seller.
 *
 * This test verifies cross-seller authorization by:
 * 1. Creating two sellers (A and B) and a customer
 * 2. Customer places an order with seller A's product
 * 3. Order is shipped and delivered
 * 4. Customer submits a refund request for seller A's product
 * 5. Seller B attempts to access the refund request
 * 6. Verify access is denied with 403 Forbidden
 */
export async function test_api_refund_request_cross_seller_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller A (product owner)
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {
    body: {
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  // 2. Register and authenticate seller B (unauthorized accessor)
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {
    body: {
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  // 3. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    },
  });
  // 4. Customer adds product to cart (seller A's product)
  const cartItem =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 5. Customer places order
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Extract order item ID for shipment
  const orderItemId: string & tags.Format<"uuid"> = order.orderItems[0].id;
  // 6. Seller A creates shipment for the order item
  const shipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerAConnection,
      {
        body: {
          order_item_ids: [orderItemId],
          tracking_carrier: "FedEx",
          tracking_number: RandomGenerator.alphaNumeric(20),
        },
      },
    );
  typia.assert(shipment);
  // 7. Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 8. Customer submits refund request for the delivered order item
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItemId,
          reason: "Product was damaged during shipping",
        },
      },
    );
  typia.assert(refundRequest);
  // 9. Seller B attempts to access the refund request (should be denied)
  await TestValidator.httpError(
    "cross-seller refund request access denied",
    403,
    async () =>
      await api.functional.shoppingMall.seller.refund_requests.at(
        sellerBConnection,
        {
          refundRequestId: refundRequest.id,
        },
      ),
  );
}
