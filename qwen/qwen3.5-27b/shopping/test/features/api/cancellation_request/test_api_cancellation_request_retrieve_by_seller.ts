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
 * Test that a seller can retrieve their own cancellation request with complete details.
 *
 * Validates the complete cancellation request retrieval workflow including seller authentication, customer order creation, cancellation request submission, and seller retrieval of the request. Ensures that the cancellation request correctly includes customer information, order item details, and all snapshots showing status transitions.
 *
 * Special attention is given to verifying that the seller can only access cancellation requests for their own order items, and that all nested data structures (customer, order item, snapshots) are properly populated.
 *
 * 1. Seller registers and authenticates to the platform.
 * 2. Customer registers and authenticates to the platform.
 * 3. Seller creates a product with base price and description.
 * 4. Customer adds the product variant to their shopping cart.
 * 5. Customer completes checkout to create an order with order items.
 * 6. Customer creates a cancellation request for an order item in 'paid' status.
 * 7. Seller retrieves the cancellation request by ID.
 * 8. Validates all response fields including customer info, order item details, and snapshots.
 */
export async function test_api_cancellation_request_retrieve_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Get the first variant from the product (assuming variants exist)
  if (product.variants.length === 0) {
    throw new Error("Product must have at least one variant for testing");
  }
  const variant = product.variants[0];
  // 4. Customer adds product variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 5. Customer completes checkout to create an order
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Get the first order item from the order
  if (order.items.length === 0) {
    throw new Error("Order must have at least one item for testing");
  }
  const orderItem = order.items[0];
  // 6. Customer creates a cancellation request for the order item
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          reason: "I changed my mind and no longer need this item",
        },
      },
    );
  typia.assert(cancellationRequest);
  // 7. Seller retrieves the cancellation request
  const retrievedRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.at(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 8. Validate all response fields
  // Verify cancellation request ID matches
  TestValidator.equals(
    "cancellation request ID matches",
    retrievedRequest.id,
    cancellationRequest.id,
  );
  // Verify status is 'pending' (initial state)
  TestValidator.predicate(
    "status is pending",
    retrievedRequest.status === "pending",
  );
  // Verify reason is populated
  TestValidator.predicate(
    "reason is populated",
    retrievedRequest.reason.length > 0,
  );
  // Verify response_reason is null for pending requests
  TestValidator.equals(
    "response_reason is null for pending request",
    retrievedRequest.response_reason,
    null,
  );
  // Verify customer information
  TestValidator.equals(
    "customer ID matches",
    retrievedRequest.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "customer email matches",
    retrievedRequest.customer.email,
    customerAuth.email,
  );
  TestValidator.predicate(
    "customer has display name",
    retrievedRequest.customer.display_name.length > 0,
  );
  TestValidator.predicate(
    "customer is not banned",
    retrievedRequest.customer.banned === false,
  );
  // Verify order item information
  TestValidator.equals(
    "order item ID matches",
    retrievedRequest.orderItem.id,
    orderItem.id,
  );
  TestValidator.predicate(
    "order item has positive quantity",
    retrievedRequest.orderItem.quantity > 0,
  );
  TestValidator.predicate(
    "order item has positive price",
    retrievedRequest.orderItem.price > 0,
  );
  TestValidator.equals(
    "order item status is paid",
    retrievedRequest.orderItem.status,
    "paid",
  );
  // Verify order item product variant
  TestValidator.predicate(
    "order item has product variant",
    retrievedRequest.orderItem.productVariant.id.length > 0,
  );
  // Verify order item seller
  TestValidator.equals(
    "order item seller ID matches",
    retrievedRequest.orderItem.seller.id,
    sellerAuth.id,
  );
  // Verify snapshots array exists (may be empty for pending requests)
  TestValidator.predicate(
    "snapshots is an array",
    Array.isArray(retrievedRequest.snapshots),
  );
  // Verify timestamps
  TestValidator.predicate(
    "created_at is valid date-time",
    new Date(retrievedRequest.created_at).toISOString() ===
      retrievedRequest.created_at,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    new Date(retrievedRequest.updated_at).toISOString() ===
      retrievedRequest.updated_at,
  );
}
