import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
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
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test cancellation request snapshots when a seller responds to approve or reject the request.
 *
 * Validates the complete cancellation request lifecycle including snapshot creation when a seller responds. The test ensures that status transitions are properly recorded with immutable snapshots containing the previous status, new status, seller response, and timestamp. This provides audit trail functionality for dispute resolution and order history completeness.
 *
 * The test verifies that:
 * - Cancellation requests start in 'pending' status when created by customers
 * - Seller responses create snapshots capturing the status transition
 * - Snapshots contain status_before, status_after, seller_response, and created_at
 * - The cancellation request status updates to reflect the seller's decision
 * - Response reason is properly stored and retrievable
 *
 * 1. Seller registers and authenticates to the platform.
 * 2. Customer registers and authenticates to the platform.
 * 3. Seller creates a product with name, description, and base price.
 * 4. Customer adds product variant to shopping cart with quantity.
 * 5. Customer completes checkout to create order with paid items.
 * 6. Customer creates cancellation request for paid order item with reason.
 * 7. Seller approves cancellation request with response reason.
 * 8. Retrieve cancellation request and validate snapshots array.
 * 9. Verify snapshot contains status transition from 'pending' to 'approved'.
 * 10. Verify snapshot includes seller response text and creation timestamp.
 */
export async function test_api_cancellation_request_with_snapshots(
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
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<number & tags.Type<"uint32">>(),
      },
    },
  );
  typia.assert(product);
  // 4. Customer adds product variant to cart
  // Use product.id as fallback if variants array is empty
  const variantId = product.variants[0]?.id ?? product.id;
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variantId,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 5. Customer completes checkout to create order
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 6. Customer creates cancellation request for paid order item
  // Ensure we have a valid order item ID
  const orderItemId = order.items[0]?.id;
  if (orderItemId === undefined) {
    throw new Error("Order has no items to cancel");
  }
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItemId,
          reason:
            "I accidentally ordered the wrong item and need to cancel this purchase before it ships.",
        },
      },
    );
  typia.assert(cancellationRequest);
  // Verify initial status is 'pending'
  TestValidator.equals(
    "initial cancellation request status is pending",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "initial snapshots array is empty",
    cancellationRequest.snapshots.length === 0,
  );
  // 7. Seller approves cancellation request with response reason
  const updatedRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "approved",
          response_reason:
            "We apologize for the inconvenience. Your cancellation has been approved and a full refund will be processed.",
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 8. Verify status changed to 'approved'
  TestValidator.equals(
    "cancellation request status updated to approved",
    updatedRequest.status,
    "approved",
  );
  // 9. Verify response_reason is populated
  TestValidator.predicate(
    "response_reason is not null after approval",
    updatedRequest.response_reason !== null,
  );
  TestValidator.predicate(
    "response_reason contains seller explanation",
    updatedRequest.response_reason!.length > 0,
  );
  // 10. Verify snapshots array contains at least one snapshot
  TestValidator.predicate(
    "snapshots array contains at least one entry",
    updatedRequest.snapshots.length >= 1,
  );
  // 11. Validate the first snapshot structure
  const snapshot = updatedRequest.snapshots[0];
  typia.assert(snapshot);
  // 12. Verify snapshot status_before is 'pending'
  TestValidator.equals(
    "snapshot status_before is pending",
    snapshot.status_before,
    "pending",
  );
  // 13. Verify snapshot status_after is 'approved'
  TestValidator.equals(
    "snapshot status_after is approved",
    snapshot.status_after,
    "approved",
  );
  // 14. Verify snapshot seller_response matches the response_reason
  TestValidator.equals(
    "snapshot seller_response matches response_reason",
    snapshot.seller_response,
    updatedRequest.response_reason,
  );
  // 15. Verify snapshot created_at timestamp exists
  TestValidator.predicate(
    "snapshot created_at timestamp is valid",
    snapshot.created_at.length > 0,
  );
  // 16. Retrieve cancellation request again to verify persistence
  const retrievedRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.at(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 17. Verify retrieved request has same status and snapshots
  TestValidator.equals(
    "retrieved request status matches approved",
    retrievedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "retrieved request has same snapshot count",
    retrievedRequest.snapshots.length,
    updatedRequest.snapshots.length,
  );
}
