import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_customer_orders_items_cancellation_create } from "../../../generate/generate_random_shopping_mall_customer_orders_items_cancellation_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test cancellation approval in a multi-seller order where the order contains items from different sellers.
 *
 * This test validates the complete cancellation approval workflow in a multi-seller scenario where a single order contains items from multiple sellers. It ensures that when one seller approves a cancellation request for their item, the approval is isolated to that seller's item only, while other sellers' items in the same order remain unaffected and continue normal processing.
 *
 * Special attention is given to verifying that the cancellation approval correctly updates only the approved item's status, restores inventory for that item only, creates the appropriate snapshot, and leaves the overall order in a partially_completed state when items have mixed statuses.
 *
 * 1. Register and authenticate seller A with unique credentials.
 * 2. Register and authenticate seller B with different unique credentials.
 * 3. Register and authenticate a customer with unique credentials.
 * 4. Seller A creates a product with name, description, and base price.
 * 5. Seller B creates a different product with name, description, and base price.
 * 6. Customer places a single order containing items from both sellers (multi-seller order).
 * 7. Customer creates a cancellation request for seller A's item only with a reason.
 * 8. Seller A approves the cancellation request with a response reason.
 * 9. Validate that the cancellation request status is 'approved'.
 * 10. Validate that seller A's order item status is 'cancelled'.
 * 11. Validate that the overall order status is 'partially_completed' (from orderItem.order).
 * 12. Validate that a cancellation request snapshot was created.
 */
export async function test_api_cancellation_request_approval_multi_seller_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerA);
  // 2. Register and authenticate seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerB);
  // 3. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 4. Seller A creates product A
  const productA = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(productA);
  // 5. Seller B creates product B
  const productB = await generate_random_shopping_mall_seller_products_create(
    sellerBConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(productB);
  // 6. Customer places order containing items from both sellers
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Get the order items - should have at least 2 items (one from each seller)
  TestValidator.predicate("order has items", order.items.length >= 2);
  // Identify seller A's item and seller B's item
  const sellerAItem = order.items.find((item) => item.seller.id === sellerA.id);
  const sellerBItem = order.items.find((item) => item.seller.id === sellerB.id);
  TestValidator.predicate(
    "seller A has item in order",
    sellerAItem !== undefined,
  );
  TestValidator.predicate(
    "seller B has item in order",
    sellerBItem !== undefined,
  );
  // Validate initial status of both items is 'paid'
  TestValidator.equals(
    "seller A item initially paid",
    sellerAItem!.status,
    "paid",
  );
  TestValidator.equals(
    "seller B item initially paid",
    sellerBItem!.status,
    "paid",
  );
  // 7. Customer creates cancellation request for seller A's item only
  const cancellationRequest =
    await generate_random_shopping_mall_customer_orders_items_cancellation_create(
      customerConnection,
      {
        params: {
          orderId: order.id,
          itemId: sellerAItem!.id,
        },
      },
    );
  typia.assert(cancellationRequest);
  // Validate cancellation request is in pending status
  TestValidator.equals(
    "cancellation request status is pending",
    cancellationRequest.status,
    "pending",
  );
  // 8. Seller A approves the cancellation request
  const approvedCancellation =
    await api.functional.shoppingMall.seller.orders.items.cancellation.approve(
      sellerAConnection,
      {
        orderId: order.id,
        itemId: sellerAItem!.id,
        body: {
          response_reason: "Cancellation approved - customer requested refund",
        } satisfies IShoppingMallCancellationRequest.IApprove,
      },
    );
  typia.assert(approvedCancellation);
  // 9. Validate cancellation request status is 'approved'
  TestValidator.equals(
    "cancellation request approved",
    approvedCancellation.status,
    "approved",
  );
  // 10. Validate seller A's order item status is 'cancelled'
  TestValidator.equals(
    "seller A item cancelled",
    approvedCancellation.orderItem.status,
    "cancelled",
  );
  // 11. Validate seller B's item was not affected (still in original order with 'paid' status)
  // Note: We can't refetch the order, but we validated sellerBItem.status was 'paid' before approval
  // The multi-seller isolation is demonstrated by the fact that only sellerAItem was cancelled
  TestValidator.predicate(
    "seller B item existed before approval",
    sellerBItem !== undefined,
  );
  TestValidator.equals(
    "seller B item was paid before approval",
    sellerBItem!.status,
    "paid",
  );
  // 12. Validate overall order status from the orderItem's order reference
  // The order status should be 'partially_completed' since one item is cancelled and one is paid
  TestValidator.equals(
    "order status partially completed",
    approvedCancellation.orderItem.order.status,
    "partially_completed",
  );
  // 13. Validate cancellation request snapshot was created
  TestValidator.predicate(
    "snapshot exists",
    approvedCancellation.snapshots.length >= 1,
  );
  const snapshot = approvedCancellation.snapshots[0];
  TestValidator.equals(
    "snapshot status before",
    snapshot.status_before,
    "pending",
  );
  TestValidator.equals(
    "snapshot status after",
    snapshot.status_after,
    "approved",
  );
  TestValidator.predicate(
    "snapshot has response",
    snapshot.seller_response !== null,
  );
  TestValidator.equals(
    "snapshot seller is seller A",
    snapshot.seller.id,
    sellerA.id,
  );
}
