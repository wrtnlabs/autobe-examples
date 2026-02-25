import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

/**
 * Test customer retrieval of their own cancellation request.
 *
 * This test validates that a customer can successfully retrieve their own
 * cancellation request with complete information including:
 * - Cancellation request details (id, reason, status)
 * - Order item summary with product and variant information
 * - Complete snapshot history for audit trail
 *
 * Preconditions:
 * 1. Customer account created and authenticated
 * 2. Order placed with 'paid' status
 * 3. Cancellation request created for a 'paid' order item
 */
export async function test_api_cancellation_request_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Create an order (requires cart items and address - handled by generation function)
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 3. Find an order item with 'paid' status
  const paidOrderItem = order.orderItems.find((item) => item.status === "paid");
  if (!paidOrderItem) {
    throw new Error("No order item with 'paid' status found");
  }
  // 4. Create cancellation request for the paid order item
  const cancellationRequest =
    await generate_random_shopping_mall_customer_order_items_cancellation_request_create(
      customerConnection,
      {
        params: { orderItemId: paidOrderItem.id },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(cancellationRequest);
  // 5. Retrieve the cancellation request as the owner (customer)
  const retrieved =
    await api.functional.shoppingMall.customer.cancellation_requests.at(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(retrieved);
  // 6. Validate cancellation request details
  TestValidator.equals("id matches", retrieved.id, cancellationRequest.id);
  TestValidator.equals(
    "reason matches",
    retrieved.reason,
    cancellationRequest.reason,
  );
  TestValidator.equals("status is pending", retrieved.status, "pending");
  TestValidator.equals(
    "seller response is null",
    retrieved.sellerResponse,
    null,
  );
  TestValidator.equals(
    "rejection reason is null",
    retrieved.rejectionReason,
    null,
  );
  // 7. Validate order item summary
  TestValidator.equals(
    "order item id matches",
    retrieved.orderItem.id,
    paidOrderItem.id,
  );
  TestValidator.equals(
    "product name matches",
    retrieved.orderItem.product_name,
    paidOrderItem.productName,
  );
  TestValidator.equals(
    "variant sku matches",
    retrieved.orderItem.variant_sku_code,
    paidOrderItem.variantSkuCode,
  );
  TestValidator.equals(
    "quantity matches",
    retrieved.orderItem.quantity,
    paidOrderItem.quantity,
  );
  TestValidator.equals(
    "unit price matches",
    retrieved.orderItem.unit_price,
    paidOrderItem.unitPrice,
  );
  TestValidator.equals(
    "order item status is paid",
    retrieved.orderItem.status,
    "paid",
  );
  // 8. Validate snapshots array exists and has at least one entry
  TestValidator.predicate(
    "snapshots array exists",
    Array.isArray(retrieved.snapshots),
  );
  TestValidator.predicate(
    "has at least one snapshot",
    retrieved.snapshots.length >= 1,
  );
  // 9. Validate initial snapshot (created when cancellation request was created)
  const initialSnapshot = retrieved.snapshots[0];
  TestValidator.equals(
    "snapshot previous status is null",
    initialSnapshot.previousStatus,
    null,
  );
  TestValidator.equals(
    "snapshot new status is pending",
    initialSnapshot.newStatus,
    "pending",
  );
  TestValidator.equals(
    "snapshot reason matches",
    initialSnapshot.reason,
    cancellationRequest.reason,
  );
  TestValidator.equals(
    "snapshot seller response is null",
    initialSnapshot.sellerResponse,
    null,
  );
  TestValidator.equals(
    "snapshot rejection reason is null",
    initialSnapshot.rejectionReason,
    null,
  );
  // 10. Validate customer information
  TestValidator.equals(
    "customer id matches",
    retrieved.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "customer email matches",
    retrieved.customer.email,
    customer.email,
  );
}
