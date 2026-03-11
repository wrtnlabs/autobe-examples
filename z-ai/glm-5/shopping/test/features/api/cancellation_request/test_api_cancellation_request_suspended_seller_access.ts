import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_customer_customers_orders_items_cancellation_request_request } from "../../../generate/generate_random_shopping_mall_customer_customers_orders_items_cancellation_request_request";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that sellers can retrieve cancellation requests for their products.
 *
 * Business Context: Per Suspended Seller Processing (ID 718), suspended sellers
 * retain the ability to view and respond to pending cancellation requests.
 * This ensures customers can receive refunds even from sellers who have been
 * suspended from creating new products.
 *
 * Note: The full "suspended seller" scenario cannot be fully tested without
 * admin endpoints for seller approval and suspension. This test verifies the
 * cancellation request retrieval functionality for sellers.
 */
export async function test_api_cancellation_request_suspended_seller_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller account (will be the "suspended" seller in the scenario)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  // Step 2: Create administrator (would approve seller and later suspend them)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(adminAuth);
  // Note: In a complete implementation, the following admin operations would occur:
  // 1. Admin approves seller for product creation
  // 2. Seller creates product
  // 3. Admin suspends seller
  // These require admin endpoints not currently available in the API.
  // Step 3: Seller creates product (before suspension in the scenario)
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          basePrice: typia.random<
            number & tags.Minimum<1> & tags.Maximum<1000000>
          >(),
        },
      },
    );
  typia.assert(product);
  // Verify seller owns the product
  TestValidator.equals("product seller", product.seller.id, sellerAuth.id);
  // Step 4: Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(customerAuth);
  // Step 5: Customer places order
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(order);
  // Find order item from this seller's product
  const orderItem = order.orderItems.find(
    (item) => item.product.id === product.id,
  );
  TestValidator.predicate("order item exists", orderItem !== undefined);
  if (!orderItem) {
    throw new Error("Order item not found for seller's product");
  }
  // Step 6: Customer creates cancellation request
  const cancellationReason = RandomGenerator.paragraph({ sentences: 3 });
  const cancellationRequest =
    await generate_random_shopping_mall_customer_customers_orders_items_cancellation_request_request(
      customerConnection,
      {
        params: {
          orderId: order.id,
          itemId: orderItem.id,
        },
        body: {
          reason: cancellationReason,
        },
      },
    );
  typia.assert(cancellationRequest);
  // Verify initial cancellation request state
  TestValidator.equals(
    "cancellation status pending",
    cancellationRequest.status,
    "pending",
  );
  // Step 7: Seller retrieves the cancellation request
  // In the full scenario, this would be a "suspended" seller still able to access
  const retrievedRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.at(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // Core validations - verifying seller can access cancellation request
  TestValidator.equals(
    "request ID matches",
    retrievedRequest.id,
    cancellationRequest.id,
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.equals(
    "reason preserved",
    retrievedRequest.reason,
    cancellationReason,
  );
  // Verify order item reference
  TestValidator.equals(
    "order item ID",
    retrievedRequest.orderItem.id,
    orderItem.id,
  );
  // Verify seller can review the request
  TestValidator.equals(
    "seller ID matches",
    retrievedRequest.orderItem.seller.id,
    sellerAuth.id,
  );
  TestValidator.predicate(
    "seller is not banned",
    !retrievedRequest.orderItem.seller.banned,
  );
}
