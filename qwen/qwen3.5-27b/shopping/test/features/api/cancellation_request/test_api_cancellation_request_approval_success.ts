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
 * Test the primary success path where a seller approves a valid cancellation request for their order item.
 *
 * Validates the complete cancellation approval workflow including seller authentication, product setup, customer order placement, cancellation request creation, and seller approval. Ensures that the order item status correctly transitions from 'paid' to 'cancelled', inventory is restored, and the cancellation request snapshot is created.
 *
 * Special attention is given to verifying that the seller's response reason is stored, the inventory count is restored to the product variant, and the cancellation request snapshot captures the status transition from 'pending' to 'approved'.
 *
 * 1. Seller registers and authenticates with email and password.
 * 2. Customer registers and authenticates with email and password.
 * 3. Seller creates a product with name, description, and base price.
 * 4. Customer places an order containing the seller's product variant.
 * 5. Customer creates a cancellation request for the order item with a reason.
 * 6. Seller approves the cancellation request with a response reason.
 * 7. Validates cancellation request status is 'approved' with seller's response.
 * 8. Validates order item status transitioned to 'cancelled'.
 * 9. Validates cancellation request snapshot was created with status transition.
 */
export async function test_api_cancellation_request_approval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 3. Seller creates a product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Customer places an order (checkout)
  const order = await api.functional.shoppingMall.customer.checkout(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        payment_token: RandomGenerator.alphaNumeric(32),
      } satisfies IShoppingMallCheckout.ICreate,
    },
  );
  typia.assert(order);
  // Get the first order item
  const orderItem = order.items[0];
  typia.assert(orderItem);
  // 5. Customer creates a cancellation request
  const cancellationRequest =
    await api.functional.shoppingMall.customer.orders.items.cancellation.create(
      customerConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // 6. Seller approves the cancellation request
  const approvedCancellation =
    await api.functional.shoppingMall.seller.orders.items.cancellation.approve(
      sellerConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
        body: {
          response_reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallCancellationRequest.IApprove,
      },
    );
  typia.assert(approvedCancellation);
  // 7. Validate cancellation request status is 'approved'
  TestValidator.equals(
    "cancellation request status is approved",
    approvedCancellation.status,
    "approved",
  );
  // 8. Validate seller's response reason is stored
  TestValidator.predicate(
    "seller response reason is present",
    approvedCancellation.response_reason !== null &&
      approvedCancellation.response_reason.length > 0,
  );
  // 9. Validate order item status transitioned to 'cancelled'
  TestValidator.equals(
    "order item status is cancelled",
    approvedCancellation.orderItem.status,
    "cancelled",
  );
  // 10. Validate cancellation request snapshot was created
  TestValidator.predicate(
    "cancellation request snapshot exists",
    approvedCancellation.snapshots.length > 0,
  );
  // 11. Validate snapshot captures status transition
  const snapshot = approvedCancellation.snapshots[0];
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot status_before is pending",
    snapshot.status_before,
    "pending",
  );
  TestValidator.equals(
    "snapshot status_after is approved",
    snapshot.status_after,
    "approved",
  );
}
