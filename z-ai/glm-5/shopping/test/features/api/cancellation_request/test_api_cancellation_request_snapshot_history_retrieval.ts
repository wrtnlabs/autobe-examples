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
 * Test that a customer can retrieve the complete snapshot history for their own
 * cancellation request, validating the snapshot principle for audit trails.
 *
 * **Test Flow:**
 * 1. Seller creates account (for product/variant creation)
 * 2. Customer creates account and authenticates
 * 3. Customer places an order (creates order items with 'paid' status)
 * 4. Customer creates a cancellation request for an order item
 * 5. Seller approves the cancellation request
 * 6. Customer retrieves snapshots and validates the audit trail
 *
 * **Validations:**
 * - Response returns paginated list of snapshots
 * - Snapshots are ordered chronologically (created_at ASC)
 * - First snapshot: previousStatus=null, newStatus='pending', reason provided
 * - Second snapshot: previousStatus='pending', newStatus='approved'
 * - Pagination metadata is correct
 */
export async function test_api_cancellation_request_snapshot_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller for product/variant setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(seller);
  // 2. Create customer for order and cancellation request
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 3. Create an order (this requires product setup which the generation function handles)
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Get the first order item for cancellation request
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 4. Create cancellation request for the order item
  const cancellationReason = RandomGenerator.paragraph({ sentences: 2 });
  const cancellationRequest =
    await generate_random_shopping_mall_customer_order_items_cancellation_request_create(
      customerConnection,
      {
        body: { reason: cancellationReason },
        params: { orderItemId: orderItem.id },
      },
    );
  typia.assert(cancellationRequest);
  // 5. Seller approves the cancellation request
  const sellerResponseMessage = RandomGenerator.paragraph({ sentences: 1 });
  const approvedRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.approve(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          seller_response: sellerResponseMessage,
        } satisfies IShoppingMallCancellationRequest.IApprove,
      },
    );
  typia.assert(approvedRequest);
  // 6. Customer retrieves snapshots
  const snapshots =
    await api.functional.shoppingMall.customer.cancellation_requests.snapshots.index(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination should have current page",
    snapshots.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination should have limit",
    snapshots.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination should have at least 2 records (pending + approved)",
    snapshots.pagination.records >= 2,
  );
  // Validate snapshots are ordered chronologically
  const snapshotData = snapshots.data;
  TestValidator.predicate(
    "should have at least 2 snapshots",
    snapshotData.length >= 2,
  );
  // Validate first snapshot (pending state)
  const firstSnapshot = snapshotData[0];
  TestValidator.equals(
    "first snapshot previous status should be null",
    firstSnapshot.previousStatus,
    null,
  );
  TestValidator.equals(
    "first snapshot new status should be pending",
    firstSnapshot.newStatus,
    "pending",
  );
  TestValidator.equals(
    "first snapshot reason should match customer reason",
    firstSnapshot.reason,
    cancellationReason,
  );
  // Validate second snapshot (approved state)
  const secondSnapshot = snapshotData[1];
  TestValidator.equals(
    "second snapshot previous status should be pending",
    secondSnapshot.previousStatus,
    "pending",
  );
  TestValidator.equals(
    "second snapshot new status should be approved",
    secondSnapshot.newStatus,
    "approved",
  );
  TestValidator.equals(
    "second snapshot seller response should match",
    secondSnapshot.sellerResponse,
    sellerResponseMessage,
  );
  // Validate chronological ordering (created_at ASC)
  for (let i = 1; i < snapshotData.length; i++) {
    const prevTime = new Date(snapshotData[i - 1].createdAt).getTime();
    const currTime = new Date(snapshotData[i].createdAt).getTime();
    TestValidator.predicate(
      `snapshot ${i} should be created after snapshot ${i - 1}`,
      prevTime <= currTime,
    );
  }
}
