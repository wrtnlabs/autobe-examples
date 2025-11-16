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

export async function test_api_seller_cancellation_request_seller_view_for_unrelated_seller_forbidden(
  connection: api.IConnection,
) {
  // 1. Register Seller A
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerAPassword = RandomGenerator.alphaNumeric(12);
  const sellerAStoreName = RandomGenerator.name(2);

  const sellerAJoinBody = {
    email: sellerAEmail,
    password: sellerAPassword,
    storeName: sellerAStoreName,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAAuth);

  // 2. Register Seller B
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerBPassword = RandomGenerator.alphaNumeric(12);
  const sellerBStoreName = RandomGenerator.name(2);

  const sellerBJoinBody = {
    email: sellerBEmail,
    password: sellerBPassword,
    storeName: sellerBStoreName,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerBAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerBAuth);

  // 3. Register Customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuth);

  // 4. Create customer cart
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

  // 5. Add an item to the cart (SKU id is random to focus on auth flow)
  const cartItemCreateBody = {
    skuId: typia.random<string & tags.Format<"uuid">>(),
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id as string & tags.Format<"uuid">,
        body: cartItemCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerCartItem>(cartItem);

  // 6. Create an order from the cart
  const orderCreateBody = {
    customer_cart_id: cart.id as string & tags.Format<"uuid">,
    currency_code: cart.currency_code,
    items_subtotal_amount: cart.subtotal_amount,
    discount_total_amount: cart.discount_amount,
    shipping_total_amount: cart.shipping_amount,
    tax_total_amount: cart.tax_amount,
    grand_total_amount: cart.total_amount,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert<IShoppingMallOrder>(order);

  TestValidator.equals(
    "order currency matches cart currency",
    order.currency_code,
    cart.currency_code,
  );

  // 7. Customer creates cancellation request for the order
  const cancellationCreateBody = {
    request_reason_category: "test_reason_category",
    request_reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallOrderCancellationRequest.ICreate;

  const customerCancellation: IShoppingMallOrderCancellationRequest =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.create(
      connection,
      {
        orderId: order.id as string & tags.Format<"uuid">,
        body: cancellationCreateBody,
      },
    );
  typia.assert<IShoppingMallOrderCancellationRequest>(customerCancellation);

  TestValidator.equals(
    "cancellation request order id matches order.id",
    customerCancellation.order.id,
    order.id,
  );

  // 8. Switch to Seller A via login to ensure seller auth context
  const sellerALoginBody = {
    email: sellerAEmail,
    password: sellerAPassword,
    ip: "127.0.0.1",
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerALoginAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerALoginAuth);

  TestValidator.equals(
    "seller A id remains consistent after login",
    sellerALoginAuth.id,
    sellerAAuth.id,
  );

  // 9. As Seller A, create seller-scoped cancellation linkage for the same order
  const sellerCancellationCreateBody = {
    request_reason_category: "seller_segment_cancellation",
    request_reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallOrderCancellationRequest.ICreate;

  const sellerCancellation: IShoppingMallOrderCancellationRequest =
    await api.functional.shoppingMall.seller.orders.cancellationRequests.create(
      connection,
      {
        orderId: order.id as string & tags.Format<"uuid">,
        body: sellerCancellationCreateBody,
      },
    );
  typia.assert<IShoppingMallOrderCancellationRequest>(sellerCancellation);

  TestValidator.equals(
    "seller-side cancellation order id matches order.id",
    sellerCancellation.order.id,
    order.id,
  );

  // 10. Capture cancellationRequestId from the customer-originated request
  const cancellationRequestId = customerCancellation.id as string &
    tags.Format<"uuid">;

  // 11. Switch auth context to Seller B
  const sellerBLoginBody = {
    email: sellerBEmail,
    password: sellerBPassword,
    ip: "127.0.0.1",
    href: "https://seller-b.example.com/login",
    referrer: "https://seller-b.example.com/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerBLoginAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerBLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerBLoginAuth);

  TestValidator.equals(
    "seller B id remains consistent after login",
    sellerBLoginAuth.id,
    sellerBAuth.id,
  );

  TestValidator.notEquals(
    "seller A and seller B must be different sellers",
    sellerALoginAuth.id,
    sellerBLoginAuth.id,
  );

  // 12. As Seller B, attempt to view seller-specific cancellation subtype
  const sellerView: IShoppingMallOrderCancellationRequestOfSeller =
    await api.functional.shoppingMall.seller.orders.cancellationRequests.seller.at(
      connection,
      {
        orderId: order.id as string & tags.Format<"uuid">,
        cancellationRequestId,
      },
    );
  typia.assert<IShoppingMallOrderCancellationRequestOfSeller>(sellerView);

  // Business-level sanity checks on the returned sellerView
  TestValidator.equals(
    "sellerView.cancellationRequest.order.id matches order.id",
    sellerView.cancellationRequest.order.id,
    order.id,
  );

  TestValidator.predicate(
    "sellerView.seller.id must not accidentally equal seller B id if unrelated",
    sellerView.seller.id !== sellerBLoginAuth.id ||
      sellerView.seller.id === sellerALoginAuth.id,
  );
}
