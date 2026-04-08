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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that a customer can retrieve their own cancellation request with pending status.
 *
 * Validates the complete cancellation request retrieval flow including customer authentication, seller product setup, order creation, and cancellation request creation. Ensures that pending cancellation requests return correct data structure with null response_reason and empty snapshots array.
 *
 * Special attention is given to verifying that the nested customer object matches the authenticated customer, the order item is in 'paid' status, and no seller response has been recorded yet.
 *
 * 1. Customer registers and authenticates with email and password.
 * 2. Seller registers and authenticates with email and password.
 * 3. Seller creates a product with name, description, and base price.
 * 4. Seller creates a variant with SKU code, options, and initial stock quantity.
 * 5. Customer adds the variant to cart with quantity.
 * 6. Customer checks out to create an order with shipping address and payment.
 * 7. Customer creates a cancellation request for an order item with reason.
 * 8. Customer retrieves the cancellation request by ID.
 * 9. Validates response structure, status, customer data, order item data, and empty snapshots.
 */
export async function test_api_cancellation_request_retrieve_pending_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates a variant with inventory
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: RandomGenerator.alphaNumeric(10),
          variantOptions: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          initialStockQuantity: 10,
        },
      },
    );
  typia.assert(variant);
  // 5. Customer adds variant to cart
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
  // 6. Customer checks out to create order
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        payment_token: RandomGenerator.alphaNumeric(32),
      },
    },
  );
  typia.assert(order);
  // 7. Customer creates a cancellation request
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order.items[0].id,
          reason: "Changed my mind about this purchase, would like to cancel.",
        },
      },
    );
  typia.assert(cancellationRequest);
  // 8. Customer retrieves the cancellation request
  const retrievedRequest =
    await api.functional.shoppingMall.customer.cancellation_requests.at(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 9. Validate response structure
  TestValidator.equals(
    "request ID matches",
    retrievedRequest.id,
    cancellationRequest.id,
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.predicate(
    "reason is present",
    retrievedRequest.reason.length > 0,
  );
  TestValidator.equals(
    "response_reason is null",
    retrievedRequest.response_reason,
    null,
  );
  TestValidator.predicate(
    "created_at exists",
    retrievedRequest.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedRequest.updated_at.length > 0,
  );
  // Validate nested customer object
  TestValidator.equals(
    "customer ID matches",
    retrievedRequest.customer.id,
    cancellationRequest.customer.id,
  );
  TestValidator.equals(
    "customer email matches",
    retrievedRequest.customer.email,
    cancellationRequest.customer.email,
  );
  TestValidator.predicate(
    "customer display_name exists",
    retrievedRequest.customer.display_name.length > 0,
  );
  TestValidator.equals(
    "customer not banned",
    retrievedRequest.customer.banned,
    false,
  );
  // Validate nested orderItem object
  TestValidator.equals(
    "orderItem ID matches",
    retrievedRequest.orderItem.id,
    cancellationRequest.orderItem.id,
  );
  TestValidator.predicate(
    "orderItem quantity is positive",
    retrievedRequest.orderItem.quantity > 0,
  );
  TestValidator.predicate(
    "orderItem price is positive",
    retrievedRequest.orderItem.price > 0,
  );
  TestValidator.equals(
    "orderItem status is paid",
    retrievedRequest.orderItem.status,
    "paid",
  );
  TestValidator.predicate(
    "orderItem order exists",
    retrievedRequest.orderItem.order.id.length > 0,
  );
  TestValidator.predicate(
    "orderItem productVariant exists",
    retrievedRequest.orderItem.productVariant.id.length > 0,
  );
  TestValidator.predicate(
    "orderItem seller exists",
    retrievedRequest.orderItem.seller.id.length > 0,
  );
  // Validate snapshots array is empty
  TestValidator.equals(
    "snapshots array is empty",
    retrievedRequest.snapshots.length,
    0,
  );
}
