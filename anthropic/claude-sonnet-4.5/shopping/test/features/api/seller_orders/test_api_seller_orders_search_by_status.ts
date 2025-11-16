import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that sellers can filter orders by status to focus on orders requiring
 * action.
 *
 * This test validates the seller order search functionality with status
 * filtering, ensuring sellers can efficiently find orders in specific workflow
 * states such as payment_confirmed, processing, ready_to_ship, and shipped.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a seller account
 * 2. Test status filtering for critical seller statuses:
 *
 *    - Payment_confirmed: Orders with verified payment
 *    - Processing: Orders being prepared
 *    - Ready_to_ship: Orders ready for pickup
 *    - Shipped: Orders dispatched to buyers
 * 3. Validate that each status filter returns only matching orders
 * 4. Verify response structure and pagination metadata
 */
export async function test_api_seller_orders_search_by_status(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile("+1"),
    business_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 6,
    }),
    business_description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    store_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 5,
    }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(seller);

  // Step 2: Test status filtering for payment_confirmed
  const paymentConfirmedOrders: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: {
        status: "payment_confirmed",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(paymentConfirmedOrders);

  // Validate that all returned orders have payment_confirmed status
  if (paymentConfirmedOrders.data.length > 0) {
    for (const order of paymentConfirmedOrders.data) {
      TestValidator.equals(
        "payment_confirmed order status matches",
        order.status,
        "payment_confirmed",
      );
    }
  }

  // Step 3: Test status filtering for processing
  const processingOrders: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: {
        status: "processing",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(processingOrders);

  // Validate that all returned orders have processing status
  if (processingOrders.data.length > 0) {
    for (const order of processingOrders.data) {
      TestValidator.equals(
        "processing order status matches",
        order.status,
        "processing",
      );
    }
  }

  // Step 4: Test status filtering for ready_to_ship
  const readyToShipOrders: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: {
        status: "ready_to_ship",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(readyToShipOrders);

  // Validate that all returned orders have ready_to_ship status
  if (readyToShipOrders.data.length > 0) {
    for (const order of readyToShipOrders.data) {
      TestValidator.equals(
        "ready_to_ship order status matches",
        order.status,
        "ready_to_ship",
      );
    }
  }

  // Step 5: Test status filtering for shipped
  const shippedOrders: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: {
        status: "shipped",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(shippedOrders);

  // Validate that all returned orders have shipped status
  if (shippedOrders.data.length > 0) {
    for (const order of shippedOrders.data) {
      TestValidator.equals(
        "shipped order status matches",
        order.status,
        "shipped",
      );
    }
  }

  // Step 6: Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current page is valid",
    paymentConfirmedOrders.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    paymentConfirmedOrders.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    paymentConfirmedOrders.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    paymentConfirmedOrders.pagination.pages >= 0,
  );
}
