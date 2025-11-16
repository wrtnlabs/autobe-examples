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

export async function test_api_platform_admin_payment_status_event_detail_not_found_and_scope_validation(
  connection: api.IConnection,
) {
  /**
   * Scenario: validate that payment status event detail endpoint enforces
   * scoping by parent payment transaction and returns not-found when the event
   * either belongs to another transaction or does not exist.
   *
   * High level flow:
   *
   * 1. Create a platform admin via /auth/platformAdmin/join and keep its
   *    credentials.
   * 2. Create a customer via /auth/customer/join and obtain an authenticated
   *    customer session.
   * 3. As platformAdmin, create a payment method configuration that will be
   *    referenced by transactions.
   * 4. As platformAdmin, create a catalog product and SKU so the customer can put
   *    something into a cart.
   * 5. As customer, create a customer cart and add one cart item using the SKU.
   * 6. As customer, create an order from the cart with consistent snapshot totals.
   * 7. As platformAdmin, create two payment transactions (A and B) for the same
   *    order (or two orders if desired) using the payment method.
   * 8. As platformAdmin, create one payment status event under A and one under B.
   * 9. Call the detail endpoint with (A.id, statusEventB.id) and assert that an
   *    HttpError with not-found status is thrown.
   * 10. Call the detail endpoint with (A.id, randomNonExistingEventId) and assert
   *     that a not-found HttpError is thrown.
   * 11. Call the detail endpoint with (A.id, statusEventA.id) and assert that a
   *     valid IShoppingMallPaymentStatusEvent is returned and typia.assert
   *     passes.
   */

  // Helper to build random URLs for href/referrer
  const randomUrl = (): string =>
    `https://example.com/${RandomGenerator.alphabets(8)}`;

  // 1. Register and implicitly authenticate a new platform admin
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const platformAdminEmail = adminAuthorized.email;
  const platformAdminPassword = adminJoinBody.password;

  // 2. Register a customer and authenticate as that customer
  const customerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@customer.test.com`,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerId = customerAuthorized.id;

  // 3. Switch back to platformAdmin explicitly with login (to ensure context)
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const adminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(adminLogin);

  // 4. Create a payment method that will be used by transactions
  const paymentMethodBody = {
    code: `pm_${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Test Card",
    description: "Test payment method for E2E",
    provider_key: "test-provider",
    method_type: "card",
    currency_restriction: null,
    min_amount: null,
    max_amount: null,
    priority: 1,
    is_active: true,
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      { body: paymentMethodBody },
    );
  typia.assert(paymentMethod);

  // 5. Create a product and SKU as platformAdmin
  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: null,
    code: `P-${RandomGenerator.alphaNumeric(8)}` as string & tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: null,
    description: null,
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: null,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productBody },
    );
  typia.assert(product);

  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 10000,
    salePrice: 10000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: product.code,
        body: skuBody,
      },
    );
  typia.assert(sku);

  // 6. Switch to customer session for cart and order creation
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
    userAgent: undefined,
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);
  TestValidator.equals(
    "customer id from login should equal joined customer id",
    customerLogin.id,
    customerId,
  );

  // 7. Create a customer cart
  const customerCartBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: undefined,
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;
  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      { body: customerCartBody },
    );
  typia.assert(cart);

  // 8. Add a cart item for the SKU
  const cartItemBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: null,
  } satisfies IShoppingMallCustomerCartItem.ICreate;
  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemBody,
      },
    );
  typia.assert(cartItem);

  // 9. Create an order from the cart using consistent totals
  const itemsSubtotal = 10000;
  const discountTotal = 0;
  const shippingTotal = 0;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const orderBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "E2E test order",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 10. Switch back to platformAdmin to create payment transactions and events
  const adminRelogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(adminRelogin);

  // Create two payment transactions for the same order
  const basePaymentTx = {
    orderId: order.id,
    customerId: customerId,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: null,
    providerName: paymentMethod.provider_key ?? "test-provider",
    providerTransactionId: null,
    currency: order.currency_code as string &
      tags.MinLength<3> &
      tags.MaxLength<3>,
    authorizedAmount: grandTotal,
    capturedAmount: null,
    paymentStatus: "payment_authorized",
    providerStatus: null,
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: null,
    metadataJson: null,
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  const paymentTxA: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      { body: basePaymentTx },
    );
  typia.assert(paymentTxA);

  const paymentTxB: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      { body: basePaymentTx },
    );
  typia.assert(paymentTxB);

  // 11. Create one status event under each transaction
  const statusEventABody = {
    previous_status: paymentTxA.paymentStatus,
    new_status: "payment_captured",
    event_type: "system_transition",
    provider_event_code: null,
    provider_reference: null,
    notes: "Capture completed for transaction A",
  } satisfies IShoppingMallPaymentStatusEvent.ICreate;
  const statusEventA: IShoppingMallPaymentStatusEvent =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.statusEvents.create(
      connection,
      {
        paymentTransactionId: paymentTxA.id,
        body: statusEventABody,
      },
    );
  typia.assert(statusEventA);

  const statusEventBBody = {
    previous_status: paymentTxB.paymentStatus,
    new_status: "payment_failed",
    event_type: "system_transition",
    provider_event_code: null,
    provider_reference: null,
    notes: "Failure event for transaction B",
  } satisfies IShoppingMallPaymentStatusEvent.ICreate;
  const statusEventB: IShoppingMallPaymentStatusEvent =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.statusEvents.create(
      connection,
      {
        paymentTransactionId: paymentTxB.id,
        body: statusEventBBody,
      },
    );
  typia.assert(statusEventB);

  // 12. Negative case 1: mismatched paymentTransactionId (A) with statusEventB.id
  await TestValidator.error(
    "status event detail must not be accessible via mismatched paymentTransactionId",
    async () => {
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.statusEvents.at(
        connection,
        {
          paymentTransactionId: paymentTxA.id,
          statusEventId: statusEventB.id,
        },
      );
    },
  );

  // 13. Negative case 2: random non-existing statusEventId under transaction A
  const randomStatusEventId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "status event detail must return not-found for non-existing statusEventId",
    async () => {
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.statusEvents.at(
        connection,
        {
          paymentTransactionId: paymentTxA.id,
          statusEventId: randomStatusEventId,
        },
      );
    },
  );

  // 14. Positive case: correct combination (paymentTxA.id, statusEventA.id)
  const fetched: IShoppingMallPaymentStatusEvent =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.statusEvents.at(
      connection,
      {
        paymentTransactionId: paymentTxA.id,
        statusEventId: statusEventA.id,
      },
    );
  typia.assert(fetched);

  TestValidator.equals(
    "fetched status event id must equal created statusEventA id",
    fetched.id,
    statusEventA.id,
  );
  TestValidator.equals(
    "fetched payment_transaction_id must equal parent transaction A id",
    fetched.payment_transaction_id,
    paymentTxA.id,
  );
}
