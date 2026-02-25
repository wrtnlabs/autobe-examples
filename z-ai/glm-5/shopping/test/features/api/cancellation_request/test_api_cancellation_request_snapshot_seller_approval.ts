import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test retrieval of cancellation request snapshot after seller approval.
 *
 * This test validates the complete audit trail capability of the snapshot system,
 * ensuring that when a seller approves a cancellation request, a snapshot is created
 * that accurately captures the state transition from 'pending' to 'approved'.
 *
 * **Test Flow:**
 * 1. Customer registers and authenticates
 * 2. Seller registers and creates a product with inventory
 * 3. Customer places an order with 'paid' status items
 * 4. Customer creates a cancellation request with a reason (creates initial snapshot)
 * 5. Seller approves the cancellation request with a response message
 * 6. Customer retrieves the approval snapshot and validates all fields
 *
 * **Validations:**
 * - previousStatus is 'pending' (state before seller action)
 * - newStatus is 'approved' (state after seller approval)
 * - reason matches the customer's original cancellation reason
 * - sellerResponse contains the seller's approval message
 * - rejectionReason is null (request was approved, not rejected)
 */
export async function test_api_cancellation_request_snapshot_seller_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(customer);
  // 2. Seller authentication and product creation
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(seller);
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Customer places an order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Verify order has items with 'paid' status
  TestValidator.predicate(
    "order should have items",
    order.orderItems.length > 0,
  );
  const orderItem = order.orderItems[0];
  TestValidator.equals("order item status", orderItem.status, "paid");
  // 4. Customer creates a cancellation request
  const cancellationReason = RandomGenerator.paragraph({ sentences: 3 });
  const cancellationRequest =
    await generate_random_shopping_mall_customer_order_items_cancellation_request_create(
      customerConnection,
      {
        params: { orderItemId: orderItem.id },
        body: { reason: cancellationReason },
      },
    );
  typia.assert(cancellationRequest);
  // Verify initial state
  TestValidator.equals(
    "cancellation request status",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.equals(
    "cancellation request reason",
    cancellationRequest.reason,
    cancellationReason,
  );
  // Verify initial snapshot exists (created when cancellation request was submitted)
  TestValidator.predicate(
    "should have initial snapshot",
    cancellationRequest.snapshots.length >= 1,
  );
  const initialSnapshot = cancellationRequest.snapshots[0];
  TestValidator.equals(
    "initial snapshot previous status",
    initialSnapshot.previousStatus,
    null,
  );
  TestValidator.equals(
    "initial snapshot new status",
    initialSnapshot.newStatus,
    "pending",
  );
  // 5. Seller approves the cancellation request
  const sellerResponseMessage = "Your cancellation request has been approved.";
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
  // Verify approval state
  TestValidator.equals(
    "approved request status",
    approvedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "seller response recorded",
    approvedRequest.sellerResponse,
    sellerResponseMessage,
  );
  // Verify multiple snapshots exist (showing complete history)
  TestValidator.predicate(
    "should have at least 2 snapshots",
    approvedRequest.snapshots.length >= 2,
  );
  // 6. Retrieve the approval snapshot
  const approvalSnapshot = approvedRequest.snapshots.find(
    (snapshot) => snapshot.newStatus === "approved",
  );
  TestValidator.predicate(
    "approval snapshot should exist",
    approvalSnapshot !== undefined,
  );
  // Retrieve snapshot via API endpoint
  const retrievedSnapshot =
    await api.functional.shoppingMall.customer.cancellation_requests.snapshots.at(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        snapshotId: approvalSnapshot!.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // Validate snapshot fields
  TestValidator.equals(
    "snapshot previousStatus is pending",
    retrievedSnapshot.previousStatus,
    "pending",
  );
  TestValidator.equals(
    "snapshot newStatus is approved",
    retrievedSnapshot.newStatus,
    "approved",
  );
  TestValidator.equals(
    "snapshot reason matches original",
    retrievedSnapshot.reason,
    cancellationReason,
  );
  TestValidator.equals(
    "snapshot sellerResponse matches",
    retrievedSnapshot.sellerResponse,
    sellerResponseMessage,
  );
  TestValidator.equals(
    "snapshot rejectionReason is null",
    retrievedSnapshot.rejectionReason,
    null,
  );
}
