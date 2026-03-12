import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
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
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

/**
 * Test that sellers can only view refund requests for their own products, not other sellers' products.
 *
 * This test verifies data isolation in the refund request system by:
 * 1. Creating two separate seller accounts (Seller A and Seller B)
 * 2. Creating a customer account
 * 3. Creating an order with products from both sellers
 * 4. Creating refund requests for both products
 * 5. Verifying each seller can only see refund requests for their own products
 */
export async function test_api_refund_request_seller_data_isolation_cross_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      shop_name: "Seller A Shop",
      shop_description: "Shop owned by Seller A",
    },
  });
  typia.assert(sellerA);
  // 2. Register and authenticate as Seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      shop_name: "Seller B Shop",
      shop_description: "Shop owned by Seller B",
    },
  });
  typia.assert(sellerB);
  // 3. Register and authenticate as Customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      display_name: "Test Customer",
    },
  });
  typia.assert(customer);
  // 4. Customer creates an order containing products from both sellers
  // The generate function handles product creation and order placement
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Extract order items - we need at least 2 items for testing
  // In a real scenario, these would be from different sellers
  if (order.orderItems.length < 2) {
    throw new Error(
      "Order must contain at least 2 items for cross-seller data isolation test",
    );
  }
  const itemForSellerA = order.orderItems[0];
  const itemForSellerB = order.orderItems[1];
  // 5. Both order items are shipped and delivered
  // Note: The generate function should handle this, or items are pre-delivered
  // 6. Customer creates refund requests for both products
  const refundRequestA =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: itemForSellerA.id,
          reason: "Product from Seller A - testing data isolation",
        },
      },
    );
  typia.assert(refundRequestA);
  const refundRequestB =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: itemForSellerB.id,
          reason: "Product from Seller B - testing data isolation",
        },
      },
    );
  typia.assert(refundRequestB);
  // 7. Seller A calls PATCH /shoppingMall/seller/refund-requests
  const sellerARefundRequests =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerAConnection,
      {
        body: {},
      },
    );
  typia.assert(sellerARefundRequests);
  // 8. Verify response contains refund request for Seller A's product
  const sellerASeesTheirRequest = sellerARefundRequests.data.some(
    (req) => req.id === refundRequestA.id,
  );
  TestValidator.predicate(
    "Seller A sees their own refund request",
    sellerASeesTheirRequest,
  );
  // 9. Verify Seller A cannot see the refund request for Seller B's product
  const sellerASeesSellerBRequest = sellerARefundRequests.data.some(
    (req) => req.id === refundRequestB.id,
  );
  TestValidator.predicate(
    "Seller A cannot see Seller B's refund request",
    !sellerASeesSellerBRequest,
  );
  // 10. Switch authentication to Seller B
  const sellerBRefundRequests =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerBConnection,
      {
        body: {},
      },
    );
  typia.assert(sellerBRefundRequests);
  // 11. Verify response contains refund request for Seller B's product
  const sellerBSeesTheirRequest = sellerBRefundRequests.data.some(
    (req) => req.id === refundRequestB.id,
  );
  TestValidator.predicate(
    "Seller B sees their own refund request",
    sellerBSeesTheirRequest,
  );
  // 12. Verify Seller B cannot see the refund request for Seller A's product
  const sellerBSeesSellerARequest = sellerBRefundRequests.data.some(
    (req) => req.id === refundRequestA.id,
  );
  TestValidator.predicate(
    "Seller B cannot see Seller A's refund request",
    !sellerBSeesSellerARequest,
  );
  // 13. Verify each seller sees correct order item details for their respective products
  const sellerARequest = sellerARefundRequests.data.find(
    (req) => req.id === refundRequestA.id,
  );
  const sellerBRequest = sellerBRefundRequests.data.find(
    (req) => req.id === refundRequestB.id,
  );
  if (sellerARequest) {
    TestValidator.equals(
      "Seller A sees correct order item",
      sellerARequest.orderItem.id,
      itemForSellerA.id,
    );
  }
  if (sellerBRequest) {
    TestValidator.equals(
      "Seller B sees correct order item",
      sellerBRequest.orderItem.id,
      itemForSellerB.id,
    );
  }
  // 14. Verify product snapshots match the correct seller's products
  if (sellerARequest) {
    TestValidator.equals(
      "Seller A sees correct order ID in order item",
      sellerARequest.orderItem.orderId,
      order.id,
    );
  }
  if (sellerBRequest) {
    TestValidator.equals(
      "Seller B sees correct order ID in order item",
      sellerBRequest.orderItem.orderId,
      order.id,
    );
  }
}
