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
 * Test pagination and sorting behavior for seller refund request listing.
 *
 * This test verifies:
 * 1. Multiple refund requests are correctly paginated across pages
 * 2. Page size limits (1-100) are enforced correctly
 * 3. Default page size (20) is applied when limit is not specified
 * 4. Page numbering starts from 1 (not 0)
 * 5. Results are sorted by requested_at in descending order (newest first)
 * 6. Pagination metadata accurately reflects total records and total pages
 * 7. Navigation through multiple pages returns consistent, non-overlapping results
 * 8. Empty result set returns correct pagination metadata
 */
export async function test_api_refund_request_seller_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Setup: Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 3. Setup: Create shipping address for customer
  const address =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 4. Setup: Add product variant to cart (using SDK as no utility for product creation)
  // Note: In real scenario, products would be created by seller first
  // For this test, we'll use a mock product variant ID
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 5. Setup: Create order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shopping_mall_address_id: address.id,
      },
    },
  );
  typia.assert(order);
  // Get the first order item for refund requests
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // 6. Create multiple refund requests to test pagination (create 25 requests)
  const refundRequestCount = 25;
  const refundRequests: IShoppingMallRefundRequest[] = [];
  for (let i = 0; i < refundRequestCount; i++) {
    const refundRequest =
      await generate_random_shopping_mall_customer_order_items_refund_requests_create(
        customerConnection,
        {
          params: { orderItemId: orderItem.id },
          body: {
            reason: `Refund request #${i + 1} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
          },
        },
      );
    typia.assert(refundRequest);
    refundRequests.push(refundRequest);
    // Small delay to ensure different timestamps for sorting test
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  // 7. Test: Default pagination (no limit specified, should use default 20)
  const defaultPage =
    await api.functional.shoppingMall.seller.order_items.refund_requests.index(
      sellerConnection,
      {
        orderItemId: orderItem.id,
        body: {
          page: 1,
        },
      },
    );
  typia.assert(defaultPage);
  TestValidator.equals(
    "default page number",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals("default limit is 20", defaultPage.pagination.limit, 20);
  TestValidator.equals(
    "total records match created count",
    defaultPage.pagination.records,
    refundRequestCount,
  );
  TestValidator.equals(
    "total pages with default limit",
    defaultPage.pagination.pages,
    2,
  );
  TestValidator.predicate(
    "first page has 20 items",
    defaultPage.data.length === 20,
  );
  // 8. Test: Sorting by requested_at descending (newest first)
  const firstPageFirstItem = defaultPage.data[0];
  const firstPageLastItem = defaultPage.data[19];
  TestValidator.predicate(
    "first item is newer than last item on page",
    new Date(firstPageFirstItem.requested_at).getTime() >=
      new Date(firstPageLastItem.requested_at).getTime(),
  );
  // 9. Test: Second page navigation
  const secondPage =
    await api.functional.shoppingMall.seller.order_items.refund_requests.index(
      sellerConnection,
      {
        orderItemId: orderItem.id,
        body: {
          page: 2,
          limit: 20,
        },
      },
    );
  typia.assert(secondPage);
  TestValidator.equals("second page number", secondPage.pagination.current, 2);
  TestValidator.equals(
    "second page has remaining items",
    secondPage.data.length,
    5,
  );
  // 10. Test: No overlapping results between pages
  const firstPageIds = new Set(defaultPage.data.map((r) => r.id));
  const secondPageIds = new Set(secondPage.data.map((r) => r.id));
  firstPageIds.forEach((id) => {
    TestValidator.predicate(`no duplicate: ${id}`, !secondPageIds.has(id));
  });
  // 11. Test: Custom page size (limit = 10)
  const customLimitPage1 =
    await api.functional.shoppingMall.seller.order_items.refund_requests.index(
      sellerConnection,
      {
        orderItemId: orderItem.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(customLimitPage1);
  TestValidator.equals(
    "custom limit applied",
    customLimitPage1.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total pages with limit 10",
    customLimitPage1.pagination.pages,
    3,
  );
  TestValidator.predicate(
    "first page has 10 items",
    customLimitPage1.data.length === 10,
  );
  // 12. Test: Page size limits (min = 1, max = 100)
  const minLimitPage =
    await api.functional.shoppingMall.seller.order_items.refund_requests.index(
      sellerConnection,
      {
        orderItemId: orderItem.id,
        body: {
          page: 1,
          limit: 1,
        },
      },
    );
  typia.assert(minLimitPage);
  TestValidator.equals("minimum limit is 1", minLimitPage.data.length, 1);
  const maxLimitPage =
    await api.functional.shoppingMall.seller.order_items.refund_requests.index(
      sellerConnection,
      {
        orderItemId: orderItem.id,
        body: {
          page: 1,
          limit: 100,
        },
      },
    );
  typia.assert(maxLimitPage);
  TestValidator.predicate(
    "maximum limit returns all items",
    maxLimitPage.data.length === refundRequestCount,
  );
  // 13. Test: Empty result set pagination metadata
  // Create a new order item with no refund requests
  const cartItem2 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem2);
  const order2 = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shopping_mall_address_id: address.id,
        cart_item_ids: [cartItem2.id],
      },
    },
  );
  typia.assert(order2);
  const orderItem2 = order2.orderItems[0];
  const emptyPage =
    await api.functional.shoppingMall.seller.order_items.refund_requests.index(
      sellerConnection,
      {
        orderItemId: orderItem2.id,
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals("empty records count", emptyPage.pagination.records, 0);
  TestValidator.equals("empty pages count", emptyPage.pagination.pages, 0);
  TestValidator.equals("empty data array", emptyPage.data.length, 0);
  // 14. Test: Status filter with pagination
  const pendingPage =
    await api.functional.shoppingMall.seller.order_items.refund_requests.index(
      sellerConnection,
      {
        orderItemId: orderItem.id,
        body: {
          page: 1,
          limit: 10,
          status: "pending",
        },
      },
    );
  typia.assert(pendingPage);
  TestValidator.predicate(
    "all filtered items are pending",
    pendingPage.data.every((r) => r.status === "pending"),
  );
  TestValidator.predicate(
    "filtered count less than or equal to total",
    pendingPage.pagination.records <= refundRequestCount,
  );
  // 15. Test: Date range filter with pagination
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dateFilteredPage =
    await api.functional.shoppingMall.seller.order_items.refund_requests.index(
      sellerConnection,
      {
        orderItemId: orderItem.id,
        body: {
          page: 1,
          limit: 10,
          requested_at: {
            from: oneHourAgo.toISOString(),
            to: now.toISOString(),
          },
        },
      },
    );
  typia.assert(dateFilteredPage);
  TestValidator.predicate(
    "all filtered items within date range",
    dateFilteredPage.data.every(
      (r) =>
        new Date(r.requested_at).getTime() >= oneHourAgo.getTime() &&
        new Date(r.requested_at).getTime() <= now.getTime(),
    ),
  );
}