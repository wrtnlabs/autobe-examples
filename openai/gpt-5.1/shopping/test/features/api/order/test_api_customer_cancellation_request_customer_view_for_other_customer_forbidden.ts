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
 * Verify that a customer cannot view another customer’s
 * cancellation-request-of-customer resource, while the owner can.
 *
 * Steps
 *
 * 1. Sign up Customer A (auth.customer.join) so that the SDK connection is
 *    authenticated as A.
 * 2. Create a customer cart for A (shoppingMall.customer.customerCarts.create).
 * 3. Add at least one item into that cart using a random SKU id and quantity
 *    (customerCarts.items.create).
 * 4. Create an order from that cart (customer.orders.create) with a valid
 *    IShoppingMallOrder.ICreate snapshot body.
 * 5. Create a cancellation request for that order as Customer A
 *    (customer.orders.cancellationRequests.create).
 * 6. Call the customer-view endpoint for that cancellation as Customer A to prove
 *    it exists and is accessible to the owner, and typia.assert the response.
 * 7. Sign up Customer B with a second auth.customer.join call – this updates
 *    connection Authorization to B.
 * 8. As Customer B, call the same customer-view endpoint
 *    (shoppingMall.customer.orders.cancellationRequests.customer.at) using the
 *    orderId and cancellationRequestId belonging to Customer A.
 * 9. Wrap the Customer B call in TestValidator.error with an async closure and
 *    await it, asserting only that it throws (no status-code checks).
 * 10. This validates that customer-scoped cancellation views are protected by
 *     ownership.
 */
export async function test_api_customer_cancellation_request_customer_view_for_other_customer_forbidden(
  connection: api.IConnection,
) {
  // 1. Sign up Customer A
  const joinBodyA = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBodyA,
    });
  typia.assert(customerA);

  // 2. Create a cart for Customer A
  const cartCreateBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: undefined,
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      { body: cartCreateBody },
    );
  typia.assert(cart);

  // 3. Add an item into the cart
  const cartItemCreateBody = {
    skuId: typia.random<string & tags.Format<"uuid">>(),
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: null,
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);

  // 4. Create an order from the cart
  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: cart.subtotal_amount,
    discount_total_amount: cart.discount_amount,
    shipping_total_amount: cart.shipping_amount,
    tax_total_amount: cart.tax_amount,
    grand_total_amount: cart.total_amount,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Customer A initial order",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 5. Create a cancellation request for the order as Customer A
  const cancellationCreateBody = {
    request_reason_category: "ordered_by_mistake",
    request_reason_detail: "Customer A created this order by mistake.",
  } satisfies IShoppingMallOrderCancellationRequest.ICreate;

  const cancellation: IShoppingMallOrderCancellationRequest =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.create(
      connection,
      {
        orderId: order.id,
        body: cancellationCreateBody,
      },
    );
  typia.assert(cancellation);

  // 6. Owner can view customer-specific cancellation subtype
  const customerViewByOwner: IShoppingMallOrderCancellationRequestOfCustomer =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.customer.at(
      connection,
      {
        orderId: order.id,
        cancellationRequestId: cancellation.id,
      },
    );
  typia.assert(customerViewByOwner);

  TestValidator.equals(
    "owner view returns subtype linked to same cancellation request",
    customerViewByOwner.cancellationRequest.id,
    cancellation.id,
  );

  // 7. Sign up Customer B, which switches authorization context
  const joinBodyB = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBodyB,
    });
  typia.assert(customerB);

  // 8-9. As Customer B, attempting to view A's cancellation must fail
  await TestValidator.error(
    "other customer cannot view customer-specific cancellation request of another customer",
    async () => {
      await api.functional.shoppingMall.customer.orders.cancellationRequests.customer.at(
        connection,
        {
          orderId: order.id,
          cancellationRequestId: cancellation.id,
        },
      );
    },
  );
}
