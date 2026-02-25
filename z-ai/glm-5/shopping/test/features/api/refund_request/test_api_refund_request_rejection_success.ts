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

export async function test_api_refund_request_rejection_success(
  connection: api.IConnection,
): Promise<void> {
  // ===========================================
  // SETUP: Create seller and customer accounts
  // ===========================================
  // 1. Seller registers
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph(),
    },
  });
  // 2. Customer registers
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // ===========================================
  // PREREQUISITES: Create order, ship, deliver
  // ===========================================
  // 3. Create order (requires address_id - using random UUID as prerequisite)
  const addressId = typia.random<string & tags.Format<"uuid">>();
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        address_id: addressId,
      },
    },
  );
  typia.assert(order);
  // 4. Get order item (first item from the order)
  const orderItem = order.orderItems[0];
  if (!orderItem) {
    throw new Error("No order items found in the order");
  }
  // 5. Seller ships the order
  const shipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          orderItemIds: [orderItem.id],
          carrierName: "FedEx",
          trackingNumber: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(shipment);
  // 6. Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 7. Customer creates refund request
  const refundRequest =
    await generate_random_shopping_mall_customer_orders_items_refund_create(
      customerConnection,
      {
        params: {
          orderId: order.id,
          orderItemId: orderItem.id,
        },
        body: {
          reason: "Product does not match description",
        },
      },
    );
  typia.assert(refundRequest);
  // ===========================================
  // VERIFY: Initial refund request state
  // ===========================================
  TestValidator.equals(
    "refund request should have pending status",
    refundRequest.status,
    "pending",
  );
  TestValidator.equals(
    "refund request should have rejection reason as null",
    refundRequest.rejectionReason,
    null,
  );
  // ===========================================
  // EXECUTE: Seller rejects refund request
  // ===========================================
  const rejectionReason =
    "The product was delivered in perfect condition as described.";
  const rejectedRequest =
    await api.functional.shoppingMall.seller.sellers.me.refund_requests.reject(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          rejectionReason,
          sellerResponse:
            "We have reviewed your request and found no issues with the product.",
        } satisfies IShoppingMallRefundRequest.IReject,
      },
    );
  typia.assert(rejectedRequest);
  // ===========================================
  // VERIFY: Rejection success
  // ===========================================
  TestValidator.equals(
    "refund request status should be rejected",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason should be recorded",
    rejectedRequest.rejectionReason,
    rejectionReason,
  );
  TestValidator.predicate(
    "seller response should be recorded",
    rejectedRequest.sellerResponse !== null,
  );
}
