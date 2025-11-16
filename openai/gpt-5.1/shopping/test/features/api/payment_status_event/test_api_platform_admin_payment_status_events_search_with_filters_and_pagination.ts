import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentStatusEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentStatusEvent";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentStatusEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentStatusEvent";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that a platform admin can filter and paginate payment status events
 * by status and created_at window for a specific payment transaction.
 *
 * Business flow:
 *
 * 1. Register a platform admin and obtain an authorized admin session.
 * 2. Register a customer and obtain an authorized customer session.
 * 3. As customer, create a cart, then as admin create a product and SKU.
 * 4. As customer, add the SKU to the cart and create an order from that cart.
 * 5. As admin, create a payment method and a payment transaction for the order.
 * 6. For that payment transaction, create three payment status events with
 *    distinct new_status values along a logical lifecycle (pending ->
 *    authorized -> captured).
 * 7. Call the statusEvents index (PATCH) endpoint with filters:
 *
 *    - Status = "payment_authorized"
 *    - FromCreatedAt/toCreatedAt around the authorized event
 *    - Limit = 1, page = 1 and verify that exactly one event is returned and that it
 *         matches the filter conditions and belongs to the payment
 *         transaction.
 * 8. Call the same search with page = 2 and assert that no additional data is
 *    returned and pagination metadata is consistent, including that
 *    pagination.current reflects the second page with a 0-based index.
 * 9. Additionally, call the endpoint with a broader date window and with
 *    orderDirection set to "asc" and "desc" to verify that the ordering of
 *    events by created_at is reversed between the two calls.
 */
export async function test_api_platform_admin_payment_status_events_search_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register and login platform admin
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://admin.local/join",
    referrer: "https://admin.local/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register and login customer
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const customerJoinBody = {
    email: customerEmail,
    password: "P@ssw0rd!",
    name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://shop.local/join",
    referrer: "https://shop.local/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 3. As customer, create a cart
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
  typia.assert(cart);

  // 4. As platform admin, create product and SKU
  const adminLoginBody = {
    email: adminEmail,
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://admin.local/login",
    referrer: "https://admin.local/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  const productCode = `TEST-PROD-${RandomGenerator.alphaNumeric(8)}`;

  const productCreateBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: null,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: null,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productCreateBody },
    );
  typia.assert(product);

  const skuCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 100,
    salePrice: 90,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: product.code,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // 5. As customer, login again and add item to cart
  const customerLoginBody = {
    email: customerEmail,
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://shop.local/login",
    referrer: "https://shop.local/landing",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "test cart item",
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

  // 6. Create an order from the cart
  const itemsSubtotal = 90;
  const discountTotal = 0;
  const shippingTotal = 10;
  const taxTotal = 9;
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
    customer_note: "payment status events test order",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 7. As platform admin, login again to create payment method and transaction
  const adminLogin2: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin2);

  const paymentMethodCreateBody = {
    code: `PM-${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Test Card",
    description: "E2E payment method for status event tests",
    provider_key: "test-provider",
    method_type: "card",
    currency_restriction: null,
    min_amount: null,
    max_amount: null,
    priority: 1 as number & tags.Type<"int32">,
    is_active: true,
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      {
        body: paymentMethodCreateBody,
      },
    );
  typia.assert(paymentMethod);

  const paymentTransactionCreateBody = {
    orderId: order.id,
    customerId: order.customer_id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: null,
    providerName: paymentMethod.provider_key ?? "test-provider",
    providerTransactionId: null,
    currency: (order.currency_code ?? "USD") satisfies string as string,
    authorizedAmount: grandTotal,
    capturedAmount: null,
    paymentStatus: "payment_pending",
    providerStatus: null,
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: false,
    metadataJson: null,
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  const paymentTransaction: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      {
        body: paymentTransactionCreateBody,
      },
    );
  typia.assert(paymentTransaction);

  // 8. Create three status events for the transaction
  const makeEventBody = (
    previous: string | null,
    next: string,
    type: string,
    notes: string,
  ): IShoppingMallPaymentStatusEvent.ICreate =>
    ({
      previous_status: previous,
      new_status: next,
      event_type: type,
      provider_event_code: null,
      provider_reference: null,
      notes,
    }) satisfies IShoppingMallPaymentStatusEvent.ICreate;

  const event1: IShoppingMallPaymentStatusEvent =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.statusEvents.create(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: makeEventBody(
          null,
          "payment_pending",
          "system_transition",
          "initial pending",
        ),
      },
    );
  typia.assert(event1);

  const event2: IShoppingMallPaymentStatusEvent =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.statusEvents.create(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: makeEventBody(
          "payment_pending",
          "payment_authorized",
          "provider_webhook",
          "authorized",
        ),
      },
    );
  typia.assert(event2);

  const event3: IShoppingMallPaymentStatusEvent =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.statusEvents.create(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: makeEventBody(
          "payment_authorized",
          "payment_captured",
          "provider_webhook",
          "captured",
        ),
      },
    );
  typia.assert(event3);

  // 9. Search with filter for payment_authorized in a time window around event2
  const fromCreatedAt = new Date(
    new Date(event2.created_at).getTime() - 5_000,
  ).toISOString();
  const toCreatedAt = new Date(
    new Date(event2.created_at).getTime() + 5_000,
  ).toISOString();

  const searchBodyPage1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 1 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    status: "payment_authorized",
    origin: undefined,
    fromCreatedAt,
    toCreatedAt,
    search: undefined,
    orderBy: "created_at",
    orderDirection: "asc" as const,
  } satisfies IShoppingMallPaymentStatusEvent.IRequest;

  const page1: IPageIShoppingMallPaymentStatusEvent.ISummary =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.statusEvents.index(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: searchBodyPage1,
      },
    );
  typia.assert(page1);

  TestValidator.predicate(
    "page1 should have exactly one data item",
    page1.data.length === 1,
  );

  TestValidator.predicate(
    "page1 pagination records should be at least 1",
    page1.pagination.records >= 1,
  );

  const firstEvent = page1.data[0];

  TestValidator.equals(
    "returned event new_status is payment_authorized",
    firstEvent.new_status,
    "payment_authorized",
  );

  const occurredAtTime = new Date(firstEvent.occurred_at).getTime();
  const fromTime = new Date(fromCreatedAt).getTime();
  const toTime = new Date(toCreatedAt).getTime();

  TestValidator.predicate(
    "occurred_at is within requested window",
    occurredAtTime >= fromTime && occurredAtTime <= toTime,
  );

  TestValidator.equals(
    "payment transaction id matches in summary",
    firstEvent.payment_transaction.id,
    paymentTransaction.id,
  );

  // 10. Request second page with same filters, expecting empty data
  const searchBodyPage2 = {
    ...searchBodyPage1,
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallPaymentStatusEvent.IRequest;

  const page2: IPageIShoppingMallPaymentStatusEvent.ISummary =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.statusEvents.index(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: searchBodyPage2,
      },
    );
  typia.assert(page2);

  TestValidator.equals("page2 should have no data items", page2.data.length, 0);

  TestValidator.equals(
    "pagination records should be consistent between page1 and page2",
    page2.pagination.records,
    page1.pagination.records,
  );

  // pagination.current is 0-based index; for request page 2, current should be 1
  TestValidator.equals(
    "pagination.current should reflect second page (0-based index)",
    page2.pagination.current,
    1,
  );

  // 11. Optional ordering test with broader window and both directions
  const broadSearchAsc = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    status: undefined,
    origin: undefined,
    fromCreatedAt: new Date(
      new Date(event1.created_at).getTime() - 5_000,
    ).toISOString(),
    toCreatedAt: new Date(
      new Date(event3.created_at).getTime() + 5_000,
    ).toISOString(),
    search: undefined,
    orderBy: "created_at",
    orderDirection: "asc" as const,
  } satisfies IShoppingMallPaymentStatusEvent.IRequest;

  const broadAsc: IPageIShoppingMallPaymentStatusEvent.ISummary =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.statusEvents.index(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: broadSearchAsc,
      },
    );
  typia.assert(broadAsc);

  const broadSearchDesc = {
    ...broadSearchAsc,
    orderDirection: "desc" as const,
  } satisfies IShoppingMallPaymentStatusEvent.IRequest;

  const broadDesc: IPageIShoppingMallPaymentStatusEvent.ISummary =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.statusEvents.index(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: broadSearchDesc,
      },
    );
  typia.assert(broadDesc);

  const ascIds = broadAsc.data.map((e) => e.id);
  const descIds = broadDesc.data.map((e) => e.id);

  TestValidator.predicate(
    "broad asc results should contain at least 3 events",
    ascIds.length >= 3,
  );

  TestValidator.equals(
    "descending order should be reverse of ascending order for same window",
    descIds,
    [...ascIds].reverse(),
  );
}
