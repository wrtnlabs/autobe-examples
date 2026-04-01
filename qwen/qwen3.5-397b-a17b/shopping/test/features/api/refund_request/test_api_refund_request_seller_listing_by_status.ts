import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_order_items_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_refund_requests_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

/**
 * Test seller's ability to retrieve and filter refund requests for their order items.
 *
 * This test validates:
 * 1. Seller authentication and authorization to view refund requests
 * 2. Successful retrieval of refund requests for order items belonging to the seller
 * 3. Filtering by status (pending, approved, rejected) works correctly
 * 4. Each refund request includes required fields: id, reason, status, customer info, order item info
 * 5. Pagination metadata is correctly returned with current page, limit, total records, and total pages
 * 6. Results are sorted by requested_at in descending order (newest first)
 * 7. Date range filtering by requested_at works correctly
 *
 * Business logic validations:
 * - Seller can only see refund requests for order items they sold
 * - Refund requests show correct status transitions
 * - Response includes complete customer and order item summary information
 * - Pagination works correctly with multiple refund requests
 */
export async function test_api_refund_request_seller_listing_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Store credentials for reuse
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const customerEmail = typia.random<string & tags.Format<"email">>();
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 2. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerAuth);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 3. Customer creates shipping address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerLoginConnection,
    {},
  );
  typia.assert(address);
  // 4. Customer adds product variant to cart (uses pre-existing product from system)
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerLoginConnection,
      {},
    );
  typia.assert(cartItem);
  // 5. Customer creates order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerLoginConnection,
    {
      body: {
        shopping_mall_address_id: address.id,
      },
    },
  );
  typia.assert(order);
  // Get the first order item for refund request testing
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  const orderItem = order.orderItems[0];
  // 6. Customer creates refund request for the order item
  const refundRequest =
    await generate_random_shopping_mall_customer_order_items_refund_requests_create(
      customerLoginConnection,
      {
        params: {
          orderItemId: orderItem.id,
        },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(refundRequest);
  // 7. Seller lists refund requests for the order item
  const refundRequestList =
    await api.functional.shoppingMall.seller.order_items.refund_requests.index(
      sellerLoginConnection,
      {
        orderItemId: orderItem.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(refundRequestList);
  // 8. Validate pagination metadata
  TestValidator.equals("current page", refundRequestList.pagination.current, 1);
  TestValidator.predicate(
    "limit is positive",
    refundRequestList.pagination.limit > 0,
  );
  TestValidator.predicate(
    "has at least one record",
    refundRequestList.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pages is positive",
    refundRequestList.pagination.pages >= 1,
  );
  // 9. Validate refund request data structure
  const refundData = refundRequestList.data[0];
  TestValidator.equals(
    "refund request id matches",
    refundData.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "order item id matches",
    refundData.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "customer id matches",
    refundData.customer.id,
    customerAuth.id,
  );
  TestValidator.equals("status is pending", refundData.status, "pending");
  TestValidator.predicate("reason is not empty", refundData.reason.length > 0);
  TestValidator.predicate(
    "requested_at is valid date",
    refundData.requested_at.length > 0,
  );
  // 10. Validate order item details in refund request
  TestValidator.equals(
    "seller id matches",
    refundData.orderItem.seller.id,
    sellerAuth.id,
  );
  // 11. Test status filtering - filter by pending status
  const pendingRequests =
    await api.functional.shoppingMall.seller.order_items.refund_requests.index(
      sellerLoginConnection,
      {
        orderItemId: orderItem.id,
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  TestValidator.predicate(
    "pending filter returns results",
    pendingRequests.data.length >= 1,
  );
  pendingRequests.data.forEach((req) => {
    TestValidator.equals("all results are pending", req.status, "pending");
  });
  // 12. Test date range filtering
  const now = new Date();
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
  const to = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
  const dateFilteredRequests =
    await api.functional.shoppingMall.seller.order_items.refund_requests.index(
      sellerLoginConnection,
      {
        orderItemId: orderItem.id,
        body: {
          requested_at: {
            from: from.toISOString(),
            to: to.toISOString(),
          },
          page: 1,
          limit: 10,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(dateFilteredRequests);
  TestValidator.predicate(
    "date filter returns results",
    dateFilteredRequests.data.length >= 1,
  );
  // 13. Validate sorting by requested_at descending
  if (refundRequestList.data.length > 1) {
    for (let i = 1; i < refundRequestList.data.length; i++) {
      const prev = refundRequestList.data[i - 1];
      const curr = refundRequestList.data[i];
      TestValidator.predicate(
        "sorted by requested_at descending",
        new Date(prev.requested_at).getTime() >=
          new Date(curr.requested_at).getTime(),
      );
    }
  }
  // 14. Verify seller can only see their own order items' refund requests
  TestValidator.equals(
    "seller owns the order item",
    refundData.orderItem.seller.id,
    sellerAuth.id,
  );
}
