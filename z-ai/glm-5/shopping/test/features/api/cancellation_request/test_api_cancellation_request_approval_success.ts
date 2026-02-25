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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test the complete flow of a seller approving a customer's cancellation request for a paid order item.
 *
 * Setup:
 * 1. Seller account is created and authenticated
 * 2. Seller creates a product with a category
 * 3. Seller creates a variant with initial stock quantity of 10
 * 4. Customer account is created and authenticated
 * 5. Customer places an order for 2 units of the variant (stock decreases to 8)
 * 6. Customer creates a cancellation request for the order item with reason 'Changed my mind'
 * 7. Cancellation request exists with status='pending'
 *
 * Test Execution:
 * - Seller calls PUT /shoppingMall/seller/cancellation-requests/{cancellationRequestId}/approve
 * - Includes seller_response: 'Approved as per our policy'
 *
 * Expected Results:
 * 1. Response returns 200 OK with updated cancellation request
 * 2. Cancellation request status changes from 'pending' to 'approved'
 * 3. Order item status changes from 'paid' to 'cancelled'
 * 4. Immutable snapshot is created in shopping_mall_cancellation_request_snapshots
 * 5. seller_response is recorded in the cancellation request
 */
export async function test_api_cancellation_request_approval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create variant with initial stock of 10
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          stockQuantity: 10,
        },
      },
    );
  typia.assert(variant);
  // 4. Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 5. Create order (this creates order items with 'paid' status)
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Verify order was created and has order items
  TestValidator.predicate("order has order items", order.orderItems.length > 0);
  // Get the order item for cancellation
  const orderItem = order.orderItems[0];
  if (orderItem === undefined) {
    throw new Error("No order items in the order");
  }
  // Verify initial order item status is 'paid'
  TestValidator.equals("initial order item status", orderItem.status, "paid");
  // 6. Create cancellation request for the order item
  const cancellationRequest =
    await generate_random_shopping_mall_customer_order_items_cancellation_request_create(
      customerConnection,
      {
        params: { orderItemId: orderItem.id },
        body: {
          reason: "Changed my mind",
        },
      },
    );
  typia.assert(cancellationRequest);
  // Verify cancellation request was created with 'pending' status
  TestValidator.equals(
    "cancellation request initial status",
    cancellationRequest.status,
    "pending",
  );
  // 7. Approve the cancellation request (as seller)
  const sellerResponseMessage = "Approved as per our policy";
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
  // 8. Verify cancellation request status changed to 'approved'
  TestValidator.equals(
    "cancellation request approved status",
    approvedRequest.status,
    "approved",
  );
  // 9. Verify seller_response is recorded
  TestValidator.equals(
    "seller response recorded",
    approvedRequest.sellerResponse,
    sellerResponseMessage,
  );
  // 10. Verify order item status changed to 'cancelled'
  TestValidator.equals(
    "order item cancelled status",
    approvedRequest.orderItem.status,
    "cancelled",
  );
  // 11. Verify snapshot was created
  TestValidator.predicate(
    "snapshot exists",
    approvedRequest.snapshots.length > 0,
  );
  // 12. Verify snapshot content
  const latestSnapshot =
    approvedRequest.snapshots[approvedRequest.snapshots.length - 1];
  if (latestSnapshot === undefined) {
    throw new Error("No snapshot found in the cancellation request");
  }
  TestValidator.equals(
    "snapshot previous status",
    latestSnapshot.previousStatus,
    "pending",
  );
  TestValidator.equals(
    "snapshot new status",
    latestSnapshot.newStatus,
    "approved",
  );
  TestValidator.equals(
    "snapshot reason preserved",
    latestSnapshot.reason,
    "Changed my mind",
  );
  TestValidator.equals(
    "snapshot seller response",
    latestSnapshot.sellerResponse,
    sellerResponseMessage,
  );
}
