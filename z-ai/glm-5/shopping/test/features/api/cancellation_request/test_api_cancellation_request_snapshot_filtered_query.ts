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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_order_items_cancellation_request_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_cancellation_request_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test that a customer can filter snapshots by status and date range,
 * enabling focused audit trail queries for dispute resolution.
 *
 * **Test Flow:**
 * 1. Customer creates account and authenticates via /auth/customer/join
 * 2. Seller creates account and authenticates via /auth/seller/join
 * 3. Customer places an order (creates order items with 'paid' status)
 * 4. Customer creates a cancellation request for an order item
 * 5. Seller rejects the cancellation request with rejection reason
 * 6. Customer retrieves snapshots filtered by new_status='rejected'
 * 7. Customer retrieves snapshots filtered by date range
 * 8. Validates combined filters, pagination, and empty results
 */
export async function test_api_cancellation_request_snapshot_filtered_query(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Customer creates an order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 4. Get the first order item for cancellation request
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 5. Customer creates cancellation request for the order item
  const cancellationRequest =
    await generate_random_shopping_mall_customer_order_items_cancellation_request_create(
      customerConnection,
      {
        params: { orderItemId: orderItem.id },
      },
    );
  typia.assert(cancellationRequest);
  // 6. Wait briefly to ensure timestamp separation
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 7. Seller rejects the cancellation request
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const rejectedRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.reject(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          rejectionReason: rejectionReason,
        } satisfies IShoppingMallCancellationRequest.IReject,
      },
    );
  typia.assert(rejectedRequest);
  // 8. Test filtering by new_status='rejected'
  const rejectedSnapshots =
    await api.functional.shoppingMall.customer.cancellation_requests.snapshots.index(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          new_status: "rejected",
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedSnapshots);
  TestValidator.predicate(
    "filter by new_status='rejected' returns only rejected snapshots",
    rejectedSnapshots.data.every((s) => s.newStatus === "rejected"),
  );
  // 9. Test filtering by new_status='pending'
  const pendingSnapshots =
    await api.functional.shoppingMall.customer.cancellation_requests.snapshots.index(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          new_status: "pending",
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(pendingSnapshots);
  TestValidator.predicate(
    "filter by new_status='pending' returns only pending snapshots",
    pendingSnapshots.data.every((s) => s.newStatus === "pending"),
  );
  // 10. Test filtering by date range
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const dateFilteredSnapshots =
    await api.functional.shoppingMall.customer.cancellation_requests.snapshots.index(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          created_at_from: oneHourAgo.toISOString(),
          created_at_to: oneHourLater.toISOString(),
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(dateFilteredSnapshots);
  TestValidator.predicate(
    "date range filter returns all snapshots within range",
    dateFilteredSnapshots.data.length >= 2,
  );
  // 11. Test combined filters (status + date range)
  const combinedFilterSnapshots =
    await api.functional.shoppingMall.customer.cancellation_requests.snapshots.index(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          new_status: "rejected",
          created_at_from: oneHourAgo.toISOString(),
          created_at_to: oneHourLater.toISOString(),
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(combinedFilterSnapshots);
  TestValidator.predicate(
    "combined filter returns only rejected snapshots within date range",
    combinedFilterSnapshots.data.every((s) => s.newStatus === "rejected"),
  );
  // 12. Test pagination with filters
  const firstPage =
    await api.functional.shoppingMall.customer.cancellation_requests.snapshots.index(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          limit: 1,
          page: 1,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals("first page has 1 item", firstPage.data.length, 1);
  TestValidator.equals(
    "pagination current page is 1",
    firstPage.pagination.current,
    1,
  );
  // 13. Test empty result set when filter doesn't match
  const farFuture = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const emptySnapshots =
    await api.functional.shoppingMall.customer.cancellation_requests.snapshots.index(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          created_at_from: farFuture.toISOString(),
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(emptySnapshots);
  TestValidator.equals(
    "empty result set for future date filter",
    emptySnapshots.data.length,
    0,
  );
  // 14. Validate chronological order of snapshots
  const allSnapshots =
    await api.functional.shoppingMall.customer.cancellation_requests.snapshots.index(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {} satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  const timestamps = allSnapshots.data.map((s) =>
    new Date(s.createdAt).getTime(),
  );
  const sortedTimestamps = [...timestamps].sort((a, b) => a - b);
  TestValidator.equals(
    "snapshots are in chronological order",
    timestamps,
    sortedTimestamps,
  );
}
