import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_order_items_cancellation_request_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_cancellation_request_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

export async function test_api_cancellation_request_snapshot_pagination(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test pagination functionality for cancellation request snapshots.
   *
   * Verifies:
   * - First page returns correct snapshots with pagination metadata
   * - Pagination metadata accurately reflects total records and pages
   * - Limit constraint is properly enforced
   * - Page 1 is default when page parameter is omitted
   * - Chronological order (created_at ASC) is maintained
   */
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Create order (requires address_id from separate setup)
  // Note: Address creation is a prerequisite for order placement
  const addressId = typia.random<string & tags.Format<"uuid">>();
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    { body: { address_id: addressId } },
  );
  typia.assert(order);
  // 3. Get first order item (must be in 'paid' status for cancellation)
  const orderItem = order.orderItems[0];
  if (orderItem === undefined) {
    throw new Error("Order has no items");
  }
  TestValidator.equals("order item status", orderItem.status, "paid");
  // 4. Create cancellation request for the order item
  const cancellationRequest =
    await generate_random_shopping_mall_customer_order_items_cancellation_request_create(
      customerConnection,
      {
        params: { orderItemId: orderItem.id },
        body: { reason: RandomGenerator.paragraph({ sentences: 3 }) },
      },
    );
  typia.assert(cancellationRequest);
  // 5. Test pagination - retrieve first page with limit
  const limit = 10;
  const firstPage =
    await api.functional.shoppingMall.customer.cancellation_requests.snapshots.index(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1,
          limit,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(firstPage);
  // 6. Validate pagination metadata
  TestValidator.predicate("first page has data", firstPage.data.length >= 1);
  TestValidator.predicate(
    "first page within limit",
    firstPage.data.length <= limit,
  );
  TestValidator.equals("current page is 1", firstPage.pagination.current, 1);
  TestValidator.equals(
    "limit matches request",
    firstPage.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "total records is accurate",
    firstPage.pagination.records >= 1,
  );
  TestValidator.predicate(
    "total pages calculated correctly",
    firstPage.pagination.pages ===
      Math.ceil(firstPage.pagination.records / limit),
  );
  // 7. Verify snapshot content - initial snapshot should have previousStatus as null
  const initialSnapshot = firstPage.data.find((s) => s.previousStatus === null);
  TestValidator.predicate(
    "initial snapshot exists",
    initialSnapshot !== undefined,
  );
  if (initialSnapshot !== undefined) {
    TestValidator.equals(
      "initial newStatus is pending",
      initialSnapshot.newStatus,
      "pending",
    );
    TestValidator.predicate(
      "initial reason is present",
      initialSnapshot.reason.length > 0,
    );
  }
  // 8. Test default page (page parameter omitted)
  const defaultPage =
    await api.functional.shoppingMall.customer.cancellation_requests.snapshots.index(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          limit,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.equals(
    "default page is page 1",
    defaultPage.pagination.current,
    1,
  );
  // 9. Test second page (should be empty if total records <= limit)
  const secondPage =
    await api.functional.shoppingMall.customer.cancellation_requests.snapshots.index(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 2,
          limit,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "second page number is 2",
    secondPage.pagination.current,
    2,
  );
  // Second page should be empty if only one snapshot exists
  if (firstPage.pagination.records <= limit) {
    TestValidator.equals("second page is empty", secondPage.data.length, 0);
  }
  // 10. Verify chronological order (created_at ASC)
  for (let i = 1; i < firstPage.data.length; i++) {
    const prevCreatedAt = new Date(firstPage.data[i - 1]!.createdAt).getTime();
    const currCreatedAt = new Date(firstPage.data[i]!.createdAt).getTime();
    TestValidator.predicate(
      `snapshot ${i} is chronologically after ${i - 1}`,
      prevCreatedAt <= currCreatedAt,
    );
  }
  // 11. Test with smaller limit to verify limit enforcement
  const smallLimit = 1;
  const smallLimitPage =
    await api.functional.shoppingMall.customer.cancellation_requests.snapshots.index(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1,
          limit: smallLimit,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(smallLimitPage);
  TestValidator.predicate(
    "small limit enforced",
    smallLimitPage.data.length <= smallLimit,
  );
  TestValidator.equals(
    "small limit in metadata",
    smallLimitPage.pagination.limit,
    smallLimit,
  );
}
