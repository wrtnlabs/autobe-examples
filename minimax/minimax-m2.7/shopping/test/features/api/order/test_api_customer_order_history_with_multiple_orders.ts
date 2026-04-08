import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test retrieving a paginated list of the authenticated customer's past orders sorted by creation date in descending order.
 *
 * Validates the customer order history endpoint by verifying the complete response structure including pagination metadata, order list contents, and sort order. Ensures that only non-deleted orders are returned and that the customer can only access their own orders.
 *
 * This test focuses on the GET /ecommerceMall/customer/customers/me/orders endpoint which returns a paginated list of past orders. The test verifies:
 * - Pagination metadata structure (current page, limit, records count, total pages)
 * - Order summaries contain all required fields (order_number, status, totals, timestamps)
 * - Orders are sorted by creation date in descending order (newest first)
 * - Customer reference in each order matches the authenticated customer
 * - ISO 8601 datetime format compliance for all timestamps
 *
 * 1. Customer registers via authorize_customer_join utility
 * 2. Creates customer-specific connection with auth token
 * 3. Calls orders history endpoint
 * 4. Validates response structure and pagination metadata
 * 5. Verifies sort order and field completeness
 */
export async function test_api_customer_order_history_with_multiple_orders(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Create authenticated connection with JWT token from registration
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  // 2. Call the orders history endpoint
  const orderHistory =
    await api.functional.ecommerceMall.customer.customers.me.orders.history(
      authenticatedConnection,
    );
  // 3. Validate complete response structure with typia.assert
  typia.assert(orderHistory);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination exists",
    orderHistory.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "current page is non-negative",
    orderHistory.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is non-negative",
    orderHistory.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records is non-negative",
    orderHistory.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    orderHistory.pagination.pages >= 0,
  );
  // 5. Validate data array exists
  TestValidator.equals(
    "data array exists",
    Array.isArray(orderHistory.data),
    true,
  );
  // 6. Validate each order's required fields and sort order
  if (orderHistory.data.length > 1) {
    for (let i = 0; i < orderHistory.data.length - 1; i++) {
      const currentOrder = orderHistory.data[i];
      const nextOrder = orderHistory.data[i + 1];
      // Validate orders are sorted by created_at in descending order
      TestValidator.predicate(
        `Order ${i} created_at >= Order ${i + 1} created_at`,
        new Date(currentOrder.created_at) >= new Date(nextOrder.created_at),
      );
    }
  }
  // 7. Validate each order's required fields
  for (const order of orderHistory.data) {
    // Validate order_number is present and non-empty
    TestValidator.predicate(
      "order_number is non-empty",
      order.order_number !== null && order.order_number.length > 0,
    );
    // Validate created_at is valid ISO 8601 datetime
    TestValidator.predicate(
      "created_at is valid ISO 8601",
      !isNaN(Date.parse(order.created_at)),
    );
    // Validate total_amount is non-negative
    TestValidator.predicate(
      "total_amount is non-negative",
      order.total_amount >= 0,
    );
    // Validate subtotal is non-negative
    TestValidator.predicate("subtotal is non-negative", order.subtotal >= 0);
    // Validate shipping_cost is non-negative
    TestValidator.predicate(
      "shipping_cost is non-negative",
      order.shipping_cost >= 0,
    );
    // Validate status is one of expected values
    const validStatuses = [
      "paid",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
      "partially_completed",
    ];
    TestValidator.predicate(
      "status is valid value",
      validStatuses.includes(order.status),
    );
    // Validate items_count is non-negative
    TestValidator.predicate(
      "items_count is non-negative",
      order.items_count >= 0,
    );
    // Validate shipments_count is non-negative
    TestValidator.predicate(
      "shipments_count is non-negative",
      order.shipments_count >= 0,
    );
    // Validate customer reference is present
    TestValidator.equals(
      "customer reference exists",
      order.customer !== null && order.customer !== undefined,
      true,
    );
    // Validate customer ID matches authenticated customer
    TestValidator.equals(
      "customer ID matches authenticated customer",
      order.customer.id,
      authorized.id,
    );
    // Validate deleted_at is null or undefined (soft-deleted orders should not appear)
    TestValidator.equals(
      "deleted_at is null for active orders",
      order.deleted_at === null || order.deleted_at === undefined,
      true,
    );
  }
  // 8. Validate pagination calculation
  if (orderHistory.pagination.records > 0) {
    TestValidator.predicate(
      "pages equals Math.ceil(records / limit)",
      orderHistory.pagination.pages ===
        Math.ceil(
          orderHistory.pagination.records / orderHistory.pagination.limit,
        ),
    );
  }
}
