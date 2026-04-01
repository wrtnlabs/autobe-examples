import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_order_items_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_cancellation_requests_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that a customer can successfully retrieve their own cancellation request for an order item.
 *
 * This test validates the following workflow:
 * 1. Customer account creation and authentication
 * 2. Seller account creation and authentication
 * 3. Product creation by seller
 * 4. Order creation by customer (order items start in 'paid' status)
 * 5. Cancellation request creation by customer for the order item
 * 6. Retrieval of the cancellation request using the GET endpoint
 *
 * Validates that the response includes all required fields and the cancellation request
 * belongs to the correct order item and customer.
 */
export async function test_api_cancellation_request_retrieval_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  // 2. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  // 3. Seller creates a product with required fields
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Customer creates an order
  // Note: Order creation requires addresses and cart items which should be set up
  // The generation function handles internal setup
  const order =
    await generate_random_shopping_mall_customer_orders_create(
      customerConnection,
      {
        body: {
          shopping_mall_address_id: typia.random<string & tags.Format<"uuid">>(),
          cart_item_ids: [typia.random<string & tags.Format<"uuid">>()],
        },
      },
    );
  typia.assert(order);
  // Validate order has items
  TestValidator.predicate(
    "order has at least one item",
    order.orderItems.length > 0,
  );
  const orderItem = order.orderItems[0];
  // 5. Customer creates a cancellation request for the order item
  const cancellationReason = RandomGenerator.paragraph({ sentences: 2 });
  const cancellationRequest =
    await generate_random_shopping_mall_customer_order_items_cancellation_requests_create(
      customerConnection,
      {
        body: {
          reason: cancellationReason,
        } satisfies IShoppingMallCancellationRequest.ICreate,
        params: {
          orderItemId: orderItem.id,
        },
      },
    );
  typia.assert(cancellationRequest);
  // 6. Customer retrieves the cancellation request
  const retrievedCancellationRequest =
    await api.functional.shoppingMall.customer.order_items.cancellation_requests.at(
      customerConnection,
      {
        orderItemId: orderItem.id,
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(retrievedCancellationRequest);
  // Validate the retrieved cancellation request
  TestValidator.equals(
    "cancellation request ID matches",
    retrievedCancellationRequest.id,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "order item ID matches",
    retrievedCancellationRequest.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "customer ID matches",
    retrievedCancellationRequest.customer.id,
    customerJoin.id,
  );
  TestValidator.equals(
    "reason matches",
    retrievedCancellationRequest.reason,
    cancellationReason,
  );
  TestValidator.equals(
    "status is pending",
    retrievedCancellationRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "deletedAt is null",
    retrievedCancellationRequest.deletedAt === null,
  );
  TestValidator.predicate(
    "createdAt is valid date",
    retrievedCancellationRequest.createdAt !== null,
  );
  TestValidator.predicate(
    "updatedAt is valid date",
    retrievedCancellationRequest.updatedAt !== null,
  );
  // Validate order item details in the cancellation request
  TestValidator.equals(
    "quantity matches",
    retrievedCancellationRequest.orderItem.quantity,
    orderItem.quantity,
  );
  TestValidator.equals(
    "price matches",
    retrievedCancellationRequest.orderItem.price,
    orderItem.price,
  );
}