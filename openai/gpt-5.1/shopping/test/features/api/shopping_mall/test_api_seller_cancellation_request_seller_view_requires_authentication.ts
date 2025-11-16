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
import type { IShoppingMallOrderCancellationRequestOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequestOfSeller";
import type { IShoppingMallOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLine";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Validate that seller-specific cancellation request view requires
 * authentication.
 *
 * Business context:
 *
 * - A seller can inspect the seller-side subtype of an order cancellation request
 *   via `GET
 *   /shoppingMall/seller/orders/{orderId}/cancellationRequests/{cancellationRequestId}/seller`.
 * - This view must not be accessible without a valid seller authentication token.
 *
 * Test steps:
 *
 * 1. Register a seller (join) so that a seller actor exists and the SDK stores a
 *    seller token.
 * 2. Register a customer (join) so we have an ordering actor.
 * 3. As the customer, create a cart.
 * 4. As the customer, add an item (SKU) to the cart.
 * 5. As the customer, create an order from the cart.
 * 6. As the customer, create a master cancellation request for the order and keep
 *    its id.
 * 7. As the seller, create a seller-scoped cancellation record for the same order.
 * 8. Clone the connection into an unauthenticated connection (empty headers) and
 *    call the seller-side cancellation view endpoint, expecting it to fail.
 *
 *    - Use TestValidator.error to assert that an error is thrown (unauthorized).
 * 9. Finally, call the same endpoint again with an authenticated seller connection
 *    to ensure that the seller-side cancellation subtype can be retrieved when
 *    authenticated.
 */
export async function test_api_seller_cancellation_request_seller_view_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Register a seller (join)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Register a customer (join)
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://customer.join.example.com/", // valid URI
    referrer: "https://landing.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // 3. Create a cart for the authenticated customer
  const cartCreateBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      source: "e2e-test",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerCart>(cart);

  // 4. Add an item (SKU) to the customer cart
  const cartItemCreateBody = {
    skuId: typia.random<string & tags.Format<"uuid">>(),
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "test line item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerCartItem>(cartItem);

  // 5. Create an order from the customer cart
  const itemsSubtotal = 100;
  const discountTotal = 0;
  const shippingTotal = 10;
  const taxTotal = 5;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "please deliver quickly",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert<IShoppingMallOrder>(order);

  // 6. Customer creates a master cancellation request for the order
  const customerCancellationCreateBody = {
    request_reason_category: "changed_mind",
    request_reason_detail: "no longer needed",
  } satisfies IShoppingMallOrderCancellationRequest.ICreate;

  const customerCancellation: IShoppingMallOrderCancellationRequest =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.create(
      connection,
      {
        orderId: order.id,
        body: customerCancellationCreateBody,
      },
    );
  typia.assert<IShoppingMallOrderCancellationRequest>(customerCancellation);

  const cancellationRequestId = customerCancellation.id;

  // 7. Seller creates a seller-scoped cancellation record for the same order
  // Ensure we have a fresh seller authentication context
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.login.example.com/",
    referrer: "https://seller-portal.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoginAuthorized);

  const sellerCancellationCreateBody = {
    request_reason_category: "stock_issue",
    request_reason_detail: "inventory shortage",
  } satisfies IShoppingMallOrderCancellationRequest.ICreate;

  const sellerCancellation: IShoppingMallOrderCancellationRequest =
    await api.functional.shoppingMall.seller.orders.cancellationRequests.create(
      connection,
      {
        orderId: order.id,
        body: sellerCancellationCreateBody,
      },
    );
  typia.assert<IShoppingMallOrderCancellationRequest>(sellerCancellation);

  // 8. Attempt to access seller-specific cancellation view WITHOUT authentication
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "seller cancellation view should fail without authentication",
    async () => {
      await api.functional.shoppingMall.seller.orders.cancellationRequests.seller.at(
        unauthenticatedConnection,
        {
          orderId: order.id,
          cancellationRequestId,
        },
      );
    },
  );

  // 9. Access seller-specific cancellation view WITH authenticated seller
  const sellerView: IShoppingMallOrderCancellationRequestOfSeller =
    await api.functional.shoppingMall.seller.orders.cancellationRequests.seller.at(
      connection,
      {
        orderId: order.id,
        cancellationRequestId,
      },
    );
  typia.assert<IShoppingMallOrderCancellationRequestOfSeller>(sellerView);

  // Basic sanity checks on authenticated response
  TestValidator.equals(
    "seller view cancellationRequest.order.id should match order id",
    sellerView.cancellationRequest.order.id,
    order.id,
  );
}
