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
 * Happy path: seller views seller-specific cancellation request subtype for a
 * customer-created cancellation.
 *
 * Business steps:
 *
 * 1. Customer joins and gets authorized.
 * 2. Customer creates a cart.
 * 3. Customer adds one SKU item to the cart.
 * 4. Customer creates an order based on the cart and snapshot totals.
 * 5. Customer creates a master cancellation request for that order.
 * 6. Seller joins and logs in.
 * 7. Seller creates a seller-scoped cancellation request for the same order.
 * 8. Seller fetches the seller subtype via GET
 *    /shoppingMall/seller/orders/{orderId}/cancellationRequests/{cancellationRequestId}/seller.
 * 9. Validate linkage between seller subtype, master cancellation request, seller
 *    identity, and order summary.
 */
export async function test_api_seller_cancellation_request_seller_view_happy_path(
  connection: api.IConnection,
) {
  // 1. Customer joins
  const customerJoinBody = {
    email: `customer+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer.example.com/signup",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // 2. Customer creates a cart
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
  typia.assert<IShoppingMallCustomerCart>(cart);

  // 3. Customer adds one SKU item to the cart
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
  typia.assert<IShoppingMallCustomerCartItem>(cartItem);

  // 4. Customer creates an order from the cart
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
    customer_note: "Please handle with care.",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert<IShoppingMallOrder>(order);

  // 5. Customer creates a master cancellation request for the order
  const cancellationCreateBody = {
    request_reason_category: "changed_mind",
    request_reason_detail: "Customer decided to cancel the order.",
  } satisfies IShoppingMallOrderCancellationRequest.ICreate;

  const cancellationRequest: IShoppingMallOrderCancellationRequest =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.create(
      connection,
      {
        orderId: order.id,
        body: cancellationCreateBody,
      },
    );
  typia.assert<IShoppingMallOrderCancellationRequest>(cancellationRequest);

  // 6. Seller joins
  const sellerJoinBody = {
    email: `seller+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    storeName: `Store-${RandomGenerator.name(1)}`,
    contactPhone: undefined,
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 7. Seller logs in to ensure seller auth context is active
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoginAuthorized);

  // 8. Seller creates a seller-scoped cancellation request for the same order
  const sellerCancellationCreateBody = {
    request_reason_category: cancellationCreateBody.request_reason_category,
    request_reason_detail: cancellationCreateBody.request_reason_detail,
  } satisfies IShoppingMallOrderCancellationRequest.ICreate;

  const sellerSideCancellation: IShoppingMallOrderCancellationRequest =
    await api.functional.shoppingMall.seller.orders.cancellationRequests.create(
      connection,
      {
        orderId: order.id,
        body: sellerCancellationCreateBody,
      },
    );
  typia.assert<IShoppingMallOrderCancellationRequest>(sellerSideCancellation);

  // 9. Seller fetches seller-specific cancellation request subtype
  const sellerSubtype: IShoppingMallOrderCancellationRequestOfSeller =
    await api.functional.shoppingMall.seller.orders.cancellationRequests.seller.at(
      connection,
      {
        orderId: order.id,
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert<IShoppingMallOrderCancellationRequestOfSeller>(sellerSubtype);

  // 10. Validate linkage between seller subtype, master cancellation, seller, and order
  TestValidator.equals(
    "seller subtype uses the master cancellation request id",
    sellerSubtype.shopping_mall_order_cancellation_request_id,
    cancellationRequest.id,
  );

  TestValidator.equals(
    "seller subtype uses the authenticated seller id",
    sellerSubtype.shopping_mall_seller_id,
    sellerLoginAuthorized.id,
  );

  TestValidator.equals(
    "seller subtype cancellationRequest.id matches master cancellation id",
    sellerSubtype.cancellationRequest.id,
    cancellationRequest.id,
  );

  TestValidator.equals(
    "seller subtype cancellationRequest.order.id matches created order id",
    sellerSubtype.cancellationRequest.order.id,
    order.id,
  );

  // 11. Verify timestamps are non-null / non-empty
  TestValidator.predicate(
    "seller subtype created_at should be a non-empty string",
    sellerSubtype.created_at.length > 0,
  );

  TestValidator.predicate(
    "seller subtype updated_at should be a non-empty string",
    sellerSubtype.updated_at.length > 0,
  );
}
