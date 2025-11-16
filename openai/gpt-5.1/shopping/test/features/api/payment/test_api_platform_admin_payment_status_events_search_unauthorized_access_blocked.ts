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
 * Validate that non-admin or unauthenticated callers cannot search payment
 * status events.
 *
 * Business goal
 *
 * - The payment status events search endpoint exposes sensitive payment audit
 *   history and must be restricted to platformAdmin actors only.
 * - Any unauthenticated access must result in an authentication error.
 * - Any authenticated customer-level access must also be rejected by
 *   authorization rules.
 *
 * High-level flow
 *
 * 1. Join and login as platformAdmin to obtain privileged session.
 * 2. Create a payment method configuration as platformAdmin.
 * 3. Join and login as a customer.
 * 4. As customer, create a cart, add one SKU via product+SKU setup, and create an
 *    order sufficient to serve as the business context for a payment
 *    transaction.
 * 5. Switch back to platformAdmin, create a payment transaction that references
 *    the order and payment method.
 * 6. As platformAdmin, create at least one payment status event so the index
 *    endpoint would normally have data.
 * 7. Build an unauthenticated connection (no Authorization header) and call PATCH
 *    /shoppingMall/platformAdmin/paymentTransactions/{paymentTransactionId}/statusEvents
 *    expecting an authentication/authorization error.
 * 8. Login again as customer and call the same PATCH statusEvents.index endpoint,
 *    expecting an authorization error because customers must not see
 *    platformAdmin audit data.
 * 9. Finally, ensure that a properly authenticated platformAdmin call to
 *    statusEvents.index succeeds and returns a valid page structure containing
 *    the previously inserted status event.
 */
export async function test_api_platform_admin_payment_status_events_search_unauthorized_access_blocked(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and obtain admin session
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a payment method as platformAdmin
  const now = new Date();
  const inOneMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const paymentMethodCreateBody = {
    code: `METHOD_${RandomGenerator.alphaNumeric(8)}`,
    display_name: "Test Credit Card",
    description: "Test method for e2e payment transaction",
    provider_key: "test_provider",
    method_type: "card",
    currency_restriction: null,
    min_amount: 0,
    max_amount: null,
    priority: 1 as number & tags.Type<"int32">,
    is_active: true,
    starts_at: now.toISOString(),
    ends_at: inOneMonth.toISOString(),
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      {
        body: paymentMethodCreateBody,
      },
    );
  typia.assert(paymentMethod);

  // 3. Register a customer and login as that customer
  const customerEmail = typia.random<string & tags.Format<"email">>();

  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPass123!",
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shoppingmall.local/join",
    referrer: "https://shoppingmall.local/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 4. Create a cart for the customer
  const customerCartCreateBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: undefined,
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const customerCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: customerCartCreateBody,
      },
    );
  typia.assert(customerCart);

  // 5. Switch to platformAdmin again and create product + SKU
  const adminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.local/login",
    referrer: "https://admin.shoppingmall.local/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  const productCode = `PROD_${RandomGenerator.alphaNumeric(6)}`;
  const productCreateBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: null,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: null,
    description: null,
    status: "active",
    is_multi_sku: true,
    primary_image_uri: null,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert(product);

  const skuCreateBody = {
    code: `SKU_${RandomGenerator.alphaNumeric(6)}`,
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
        productCode,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // 6. Switch back to customer and add SKU to cart
  const customerLoginBody = {
    email: customerEmail,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shoppingmall.local/login",
    referrer: "https://shoppingmall.local/landing",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: null,
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: customerCart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);

  // 7. Create an order from the cart
  const orderCreateBody = {
    customer_cart_id: customerCart.id,
    currency_code: customerCart.currency_code,
    items_subtotal_amount: 90,
    discount_total_amount: 0,
    shipping_total_amount: 0,
    tax_total_amount: 0,
    grand_total_amount: 90,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: undefined,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 8. Switch to platformAdmin and create payment transaction
  const adminLoginAgain: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAgain);

  const paymentTransactionCreateBody = {
    orderId: order.id,
    customerId: order.customer_id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: null,
    providerName: paymentMethod.provider_key ?? "test_provider",
    providerTransactionId: null,
    currency: order.currency_code,
    authorizedAmount: 90,
    capturedAmount: 90,
    paymentStatus: "payment_captured",
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

  // 9. Create at least one payment status event
  const statusEventCreateBody = {
    previous_status: null,
    new_status: paymentTransaction.paymentStatus,
    event_type: "manual_update",
    provider_event_code: null,
    provider_reference: null,
    notes: "Initial capture completed",
  } satisfies IShoppingMallPaymentStatusEvent.ICreate;

  const statusEvent: IShoppingMallPaymentStatusEvent =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.statusEvents.create(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: statusEventCreateBody,
      },
    );
  typia.assert(statusEvent);

  // 10. Build an unauthenticated connection and attempt statusEvents.index
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated caller cannot search payment status events",
    async () => {
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.statusEvents.index(
        unauthConn,
        {
          paymentTransactionId: paymentTransaction.id,
          body: {
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 10 as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
            status: undefined,
            origin: undefined,
            fromCreatedAt: undefined,
            toCreatedAt: undefined,
            search: undefined,
            orderBy: undefined,
            orderDirection: undefined,
          } satisfies IShoppingMallPaymentStatusEvent.IRequest,
        },
      );
    },
  );

  // 11. Login as customer and attempt statusEvents.index expecting authorization error
  const customerLoginAgain: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginAgain);

  await TestValidator.error(
    "customer actor cannot search payment status events",
    async () => {
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.statusEvents.index(
        connection,
        {
          paymentTransactionId: paymentTransaction.id,
          body: {
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 10 as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
            status: undefined,
            origin: undefined,
            fromCreatedAt: undefined,
            toCreatedAt: undefined,
            search: undefined,
            orderBy: undefined,
            orderDirection: undefined,
          } satisfies IShoppingMallPaymentStatusEvent.IRequest,
        },
      );
    },
  );

  // 12. Ensure that platformAdmin can successfully search status events
  const adminLoginFinal: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginFinal);

  const pageResult: IPageIShoppingMallPaymentStatusEvent.ISummary =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.statusEvents.index(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          status: undefined,
          origin: undefined,
          fromCreatedAt: undefined,
          toCreatedAt: undefined,
          search: undefined,
          orderBy: undefined,
          orderDirection: undefined,
        } satisfies IShoppingMallPaymentStatusEvent.IRequest,
      },
    );
  typia.assert(pageResult);

  TestValidator.predicate(
    "platformAdmin search must return at least one status event",
    pageResult.pagination.records >= 1,
  );
}
