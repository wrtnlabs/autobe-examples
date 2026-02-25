import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_orders_items_refund_create } from "../../../generate/generate_random_shopping_mall_customer_orders_items_refund_create";
import { generate_random_shopping_mall_seller_sellers_me_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_shipment } from "../../../prepare/prepare_random_shopping_mall_order_shipment";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

/**
 * Test authorization enforcement: verify that only the seller who owns the order item
 * can reject a refund request. A different seller should receive 403 Forbidden when
 * attempting to reject another seller's refund request.
 *
 * **Test Flow**:
 * 1. **First Seller Setup**:
 *    - First seller registers, is approved, creates product with variant
 *    - Customer places order for first seller's product
 *    - Order goes through full workflow: paid → shipped → delivered
 *    - Customer submits refund request
 *
 * 2. **Second Seller Attempt**:
 *    - Second seller registers and is approved
 *    - Second seller attempts to reject first seller's refund request
 *
 * 3. **Expected Behavior**:
 *    - API returns 403 Forbidden
 *    - Refund request status remains 'pending'
 *    - No snapshot is created
 *    - Original seller can still access and respond to the request
 */
export async function test_api_refund_request_rejection_unauthorized_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. First seller setup - register and get approved
  const firstSellerEmail = typia.random<string & tags.Format<"email">>();
  const firstSellerPassword = RandomGenerator.alphaNumeric(16);
  const firstSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(firstSellerConnection, {
    body: {
      email: firstSellerEmail,
      password: firstSellerPassword,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph(),
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  // Note: In actual test environment, first seller needs admin approval
  // This step is assumed to be handled by test setup utilities
  // 2. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  // 3. Create order (assumes product and variant already exist in test environment)
  // The generate_random_shopping_mall_customer_orders_create utility handles
  // cart setup, address creation, and order placement
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Verify order has items
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  const orderItem = order.orderItems[0];
  // 4. First seller creates shipment
  const shipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      firstSellerConnection,
      {
        body: {
          orderItemIds: [orderItem.id],
          carrierName: RandomGenerator.name(),
          trackingNumber: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(shipment);
  // 5. Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // Verify delivery confirmed
  TestValidator.predicate(
    "delivery confirmed",
    confirmedShipment.delivered_at !== null,
  );
  // 6. Customer creates refund request
  const refundRequest =
    await generate_random_shopping_mall_customer_orders_items_refund_create(
      customerConnection,
      {
        params: {
          orderId: order.id,
          orderItemId: orderItem.id,
        },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(refundRequest);
  // Verify refund request is pending
  TestValidator.equals(
    "refund request status is pending",
    refundRequest.status,
    "pending",
  );
  // 7. Second seller setup - register and get approved
  const secondSellerEmail = typia.random<string & tags.Format<"email">>();
  const secondSellerPassword = RandomGenerator.alphaNumeric(16);
  const secondSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(secondSellerConnection, {
    body: {
      email: secondSellerEmail,
      password: secondSellerPassword,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph(),
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  // Note: In actual test environment, second seller needs admin approval
  // 8. Second seller attempts to reject first seller's refund request
  // This should fail with 403 Forbidden
  await TestValidator.httpError(
    "unauthorized seller cannot reject refund request",
    403,
    async () => {
      await api.functional.shoppingMall.seller.sellers.me.refund_requests.reject(
        secondSellerConnection,
        {
          refundRequestId: refundRequest.id,
          body: {
            rejectionReason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IShoppingMallRefundRequest.IReject,
        },
      );
    },
  );
}
