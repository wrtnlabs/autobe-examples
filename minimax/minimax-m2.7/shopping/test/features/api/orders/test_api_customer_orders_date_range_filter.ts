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
 * Test customer order filtering by date range and order number search.
 *
 * Validates the filtering capabilities of the customer orders listing endpoint including:
 * - Date range filtering using createdAtFrom and createdAtTo parameters
 * - Partial order number matching with wildcard support
 * - ISO 8601 date format validation
 * - Pagination response structure
 *
 * This test verifies that customers can filter their orders by creation date range
 * and search by order number patterns. The date filter should only return orders
 * created within the specified range, and the order number search should support
 * partial matching with escaped special characters for security.
 *
 * 1. Register a customer for authentication
 * 2. Query orders with date range filter (2024-01-01 to 2024-12-31)
 * 3. Query orders with partial order number pattern (ORD%)
 * 4. Validate response contains proper pagination structure
 * 5. Verify any returned orders fall within date range
 */
export async function test_api_customer_orders_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a customer for authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Query orders with date range filter
  const dateFrom = "2024-01-01T00:00:00.000Z";
  const dateTo = "2024-12-31T23:59:59.999Z";
  const ordersResponse =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          createdAtFrom: dateFrom,
          createdAtTo: dateTo,
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(ordersResponse);
  // 3. Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    ordersResponse.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "pagination has current page",
    ordersResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    ordersResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    ordersResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    ordersResponse.pagination.pages >= 0,
  );
  // 4. Validate data array exists
  TestValidator.equals(
    "data array exists",
    Array.isArray(ordersResponse.data),
    true,
  );
  // 5. Validate returned orders fall within date range
  for (const order of ordersResponse.data) {
    const orderDate = new Date(order.created_at);
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    TestValidator.predicate(
      "order date is within range",
      orderDate >= fromDate && orderDate <= toDate,
    );
  }
  // 6. Query orders with partial order number pattern
  const wildcardResponse =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          orderNumber: "ORD%",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(wildcardResponse);
  // 7. Validate wildcard search returns orders with matching prefix
  for (const order of wildcardResponse.data) {
    TestValidator.predicate(
      "order number starts with ORD",
      order.order_number.startsWith("ORD"),
    );
  }
  // 8. Query orders with specific date range (empty result expected for new customer)
  const emptyResultResponse =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          createdAtFrom: "2020-01-01T00:00:00.000Z",
          createdAtTo: "2020-01-31T23:59:59.999Z",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(emptyResultResponse);
  // 9. Verify empty result structure is valid
  TestValidator.equals(
    "empty result pagination exists",
    emptyResultResponse.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "empty result has zero records",
    emptyResultResponse.pagination.records === 0,
  );
  TestValidator.equals(
    "empty result data array is empty",
    emptyResultResponse.data.length === 0,
    true,
  );
}
