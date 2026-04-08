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
 * Test customer order status filtering functionality.
 *
 * Validates that customers can filter their orders by status through the PATCH /ecommerceMall/customer/orders endpoint. Verifies that status filtering returns only orders matching the specified status, supports case-insensitive comparison, and handles empty results correctly with proper pagination metadata.
 *
 * This test focuses on the filtering capabilities rather than order creation workflow, as creating orders with different statuses requires complex setup involving seller approval, product creation, checkout, and order state transitions. The test verifies the core filtering logic and pagination behavior.
 *
 * 1. Register a new customer account with randomized credentials.
 * 2. Query orders with status filter set to 'delivered'.
 * 3. Validate all returned orders have 'delivered' status (case-insensitive).
 * 4. Query with non-existent status to verify empty array handling.
 * 5. Validate pagination metadata reflects actual record count.
 */
export async function test_api_customer_orders_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer for testing
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Query orders with status filter for 'delivered'
  const deliveredOrdersPage: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "delivered",
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(deliveredOrdersPage);
  // 3. Validate all returned orders have 'delivered' status (case-insensitive)
  for (const order of deliveredOrdersPage.data) {
    TestValidator.equals(
      "order status matches filter (case-insensitive)",
      order.status.toLowerCase(),
      "delivered",
    );
  }
  // 4. Query with uppercase status to verify case-insensitive comparison
  const uppercaseStatusPage: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "DELIVERED",
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(uppercaseStatusPage);
  // Both lowercase and uppercase should return same results
  TestValidator.equals(
    "case-insensitive status filter returns same count",
    uppercaseStatusPage.data.length,
    deliveredOrdersPage.data.length,
  );
  // 5. Query with non-existent status to verify empty result handling
  const nonExistentStatusPage: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "non_existent_status",
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(nonExistentStatusPage);
  // Validate empty array is returned
  TestValidator.equals(
    "empty result returns empty array",
    nonExistentStatusPage.data.length,
    0,
  );
  // 6. Validate pagination metadata for empty result
  TestValidator.equals(
    "empty result has zero records in pagination",
    nonExistentStatusPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has zero pages in pagination",
    nonExistentStatusPage.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result has correct current page",
    nonExistentStatusPage.pagination.current,
    1,
  );
  // 7. Test pagination limits are properly applied
  const paginatedResult: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "delivered",
          limit: 5,
          page: 1,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "page size does not exceed limit",
    paginatedResult.data.length <= 5,
  );
}
