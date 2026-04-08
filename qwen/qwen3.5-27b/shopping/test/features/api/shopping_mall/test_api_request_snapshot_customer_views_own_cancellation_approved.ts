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
import type { IShoppingMallRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRequestSnapshot";
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
 * Test that a customer can retrieve their own cancellation request snapshot after the seller has approved it.
 *
 * Validates the complete cancellation request workflow including customer authentication, seller authentication, product creation, order placement, cancellation request creation, seller approval, and snapshot retrieval. Ensures that the snapshot correctly captures the status transition from 'pending' to 'approved' and includes all relevant information about the request, customer, seller, and order item.
 *
 * Special attention is given to verifying that the snapshot contains accurate status transition information (statusBefore='pending', statusAfter='approved'), the seller's approval reason, and proper references to the cancellation request, customer, seller, and order item.
 *
 * 1. Customer registers and authenticates with email and password.
 * 2. Seller registers and authenticates with email and password.
 * 3. Seller creates a product with name, description, and base price.
 * 4. Customer adds product variant to shopping cart with quantity.
 * 5. Customer places order through checkout with shipping address and payment token.
 * 6. Customer creates cancellation request for order item with reason.
 * 7. Seller approves the cancellation request with response reason.
 * 8. Customer retrieves the request snapshot using the snapshot ID.
 * 9. Validates snapshot contains correct request type, status transition, and references.
 */
export async function test_api_request_snapshot_customer_views_own_cancellation_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Customer adds product variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: product.variants[0].id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 5. Customer places order through checkout
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 6. Customer creates cancellation request for order item
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order.items[0].id,
          reason: "I no longer need this item and want to cancel the order.",
        },
      },
    );
  typia.assert(cancellationRequest);
  // 7. Seller approves the cancellation request
  const approvedCancellation =
    await api.functional.shoppingMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "approved",
          response_reason:
            "We approve your cancellation request. The item will be cancelled and refunded.",
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(approvedCancellation);
  // 8. Get the snapshot ID from the cancellation request snapshots
  const snapshotId = approvedCancellation.snapshots[0].id;
  // 9. Customer retrieves the request snapshot
  const snapshot =
    await api.functional.shoppingMall.customer.request_snapshots.at(
      customerConnection,
      {
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 10. Validate snapshot contains correct information
  TestValidator.equals(
    "request type is cancellation",
    snapshot.requestType,
    "cancellation",
  );
  TestValidator.equals(
    "status before is pending",
    snapshot.statusBefore,
    "pending",
  );
  TestValidator.equals(
    "status after is approved",
    snapshot.statusAfter,
    "approved",
  );
  TestValidator.predicate(
    "seller reason is provided",
    snapshot.sellerReason !== null && snapshot.sellerReason!.length > 0,
  );
  TestValidator.equals(
    "cancellation request ID matches",
    snapshot.cancellationRequestId,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "refund request ID is null",
    snapshot.refundRequestId,
    null,
  );
  TestValidator.equals(
    "customer ID matches",
    snapshot.customer.id,
    customerAuth.id,
  );
  TestValidator.equals("seller ID matches", snapshot.seller.id, sellerAuth.id);
  TestValidator.equals(
    "order item ID matches",
    snapshot.orderItemId,
    order.items[0].id,
  );
}
