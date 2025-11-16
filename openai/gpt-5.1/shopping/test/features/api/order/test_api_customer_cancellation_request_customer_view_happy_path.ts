import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import type { IShoppingMallOrderCancellationRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequestOfCustomer";
import type { IShoppingMallOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLine";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Happy-path: customer views their own order cancellation request (customer
 * subtype).
 *
 * Business flow (adapted to available APIs/DTOs):
 *
 * 1. Register and authenticate a new customer using /auth/customer/join.
 *
 *    - Use IShoppingMallCustomerAuth.IJoin for the request body.
 *    - Receive IShoppingMallCustomer.IAuthorized, including the customer id and
 *         token.
 * 2. Create a persistent customer cart using /shoppingMall/customer/customerCarts.
 *
 *    - Use IShoppingMallCustomerCart.ICreate as body (randomized but valid).
 * 3. Add at least one item into that cart using
 *    /shoppingMall/customer/customerCarts/{customerCartId}/items.
 *
 *    - Use IShoppingMallCustomerCartItem.ICreate as body (randomized but valid).
 * 4. Create an order for the authenticated customer using
 *    /shoppingMall/customer/orders.
 *
 *    - Use IShoppingMallOrder.ICreate for the body, overriding customer_cart_id to
 *         point to the created cart.
 * 5. Create a cancellation request for that order using
 *    /shoppingMall/customer/orders/{orderId}/cancellationRequests.
 *
 *    - Use IShoppingMallOrderCancellationRequest.ICreate as body.
 * 6. Retrieve the customer-specific cancellation request subtype using GET
 *    /shoppingMall/customer/orders/{orderId}/cancellationRequests/{cancellationRequestId}/customer.
 * 7. Validate that the subtype is structurally correct and coherent:
 *
 *    - Shopping_mall_order_cancellation_request_id matches the created cancellation
 *         request id.
 *    - Shopping_mall_customer_id matches the authenticated customer id.
 *    - CancellationRequest.order.id matches the created order id.
 *    - Customer.id matches the authenticated customer id.
 *    - Created_at and updated_at fields are non-null strings (implicitly guaranteed
 *         by typia.assert).
 */
export async function test_api_customer_cancellation_request_customer_view_happy_path(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new customer
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a persistent customer cart for this customer
  const cartCreateBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    is_active: true,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      { body: cartCreateBody },
    );
  typia.assert(cart);

  // 3. Add at least one item into that cart
  const cartItemCreateBody =
    typia.random<IShoppingMallCustomerCartItem.ICreate>();

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);

  // 4. Create an order from this cart
  const orderCreateRandom = typia.random<IShoppingMallOrder.ICreate>();
  const orderCreateBody = {
    ...orderCreateRandom,
    customer_cart_id: cart.id,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 5. Create a cancellation request for this order
  const cancellationCreateBody =
    typia.random<IShoppingMallOrderCancellationRequest.ICreate>();

  const cancellation: IShoppingMallOrderCancellationRequest =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.create(
      connection,
      {
        orderId: order.id,
        body: cancellationCreateBody,
      },
    );
  typia.assert(cancellation);

  // 6. Retrieve the customer-specific cancellation subtype
  const customerSubtype: IShoppingMallOrderCancellationRequestOfCustomer =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.customer.at(
      connection,
      {
        orderId: order.id,
        cancellationRequestId: cancellation.id,
      },
    );
  typia.assert(customerSubtype);

  // 7. Business coherence validations
  TestValidator.equals(
    "customer subtype links to the correct cancellation request id",
    customerSubtype.shopping_mall_order_cancellation_request_id,
    cancellation.id,
  );

  TestValidator.equals(
    "customer subtype links to the correct customer id (foreign key)",
    customerSubtype.shopping_mall_customer_id,
    authorized.id,
  );

  TestValidator.equals(
    "customer subtype links to the correct customer id (summary)",
    customerSubtype.customer.id,
    authorized.id,
  );

  TestValidator.equals(
    "customer subtype's cancellationRequest summary refers to the same order",
    customerSubtype.cancellationRequest.order.id,
    order.id,
  );

  TestValidator.predicate(
    "customer subtype created_at is non-empty",
    customerSubtype.created_at.length > 0,
  );

  TestValidator.predicate(
    "customer subtype updated_at is non-empty",
    customerSubtype.updated_at.length > 0,
  );
}
