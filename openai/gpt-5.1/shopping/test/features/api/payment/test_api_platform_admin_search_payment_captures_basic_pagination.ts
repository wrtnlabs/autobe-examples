import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentCapture } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentCapture";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPaymentAuthorization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAuthorization";
import type { IShoppingMallPaymentCapture } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentCapture";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_platform_admin_search_payment_captures_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join) and obtain authorized session
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: "AdminPassword!234",
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a payment method configuration as platform admin
  const paymentMethodCode = `pm-${RandomGenerator.alphaNumeric(8)}`;
  const providerKey = "test-gateway";

  const paymentMethodBody = {
    code: paymentMethodCode,
    display_name: "Test Credit Card",
    description: "E2E test payment method for captures pagination",
    provider_key: providerKey,
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

  // 3. Register and login a customer (so we can create cart and order)
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPassword!234",
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shoppingmall.local/join",
    referrer: "https://shoppingmall.local/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerEmail,
    password: "CustomerPassword!234",
    ip: null,
    href: "https://shoppingmall.local/login",
    referrer: "https://shoppingmall.local/",
    userAgent: "E2E-Test-Agent/1.0",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerAuthorizedFromLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerAuthorizedFromLogin);

  // 4. As customer, create a cart
  const customerCartBody = {
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
        body: customerCartBody,
      },
    );
  typia.assert(customerCart);

  // 5. Add a cart item (using random SKU id as in provided mockups)
  const cartItemBody = {
    skuId: typia.random<string & tags.Format<"uuid">>(),
    quantity: 1,
    note: null,
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: customerCart.id,
        body: cartItemBody,
      },
    );
  typia.assert(cartItem);

  // 6. Create an order from the customer cart
  const orderCurrency = customerCart.currency_code;

  const orderSubtotal = 100;
  const orderDiscount = 0;
  const orderShipping = 0;
  const orderTax = 0;
  const orderGrandTotal =
    orderSubtotal - orderDiscount + orderShipping + orderTax;

  const orderBody = {
    customer_cart_id: customerCart.id,
    currency_code: orderCurrency,
    items_subtotal_amount: orderSubtotal,
    discount_total_amount: orderDiscount,
    shipping_total_amount: orderShipping,
    tax_total_amount: orderTax,
    grand_total_amount: orderGrandTotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: undefined,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 7. Switch back to platform admin via login (ensures admin auth context)
  const adminLoginBody = {
    email: adminEmail,
    password: "AdminPassword!234",
    ip: null,
    href: "https://admin.shoppingmall.local/login",
    referrer: "https://admin.shoppingmall.local/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminAuthorizedFromLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  // 8. Create a payment transaction for the order
  const transactionCurrency = order.currency_code;

  const paymentTransactionBody = {
    orderId: order.id,
    customerId: order.customer_id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: null,
    providerName: providerKey,
    providerTransactionId: null,
    currency: transactionCurrency,
    authorizedAmount: order.grand_total_amount,
    capturedAmount: 0,
    paymentStatus: "payment_authorized",
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
        body: paymentTransactionBody,
      },
    );
  typia.assert(paymentTransaction);

  // 9. Create multiple captures under this payment transaction
  const totalCaptures = 5;
  const captureCurrency = paymentTransaction.currency;

  const captureAmounts = ArrayUtil.repeat(
    totalCaptures,
    (index) => 10 + index * 5,
  );

  const createdCaptureIds: (string & tags.Format<"uuid">)[] = [];

  await ArrayUtil.asyncForEach(captureAmounts, async (amount) => {
    const captureBody = {
      shopping_mall_payment_authorization_id: null,
      provider_capture_id: null,
      amount,
      currency: captureCurrency,
      capture_status: "capture_succeeded",
      provider_status: null,
      failure_reason_code: null,
      failure_reason_message: null,
    } satisfies IShoppingMallPaymentCapture.ICreate;

    const capture: IShoppingMallPaymentCapture =
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.create(
        connection,
        {
          paymentTransactionId: paymentTransaction.id,
          body: captureBody,
        },
      );
    typia.assert(capture);
    createdCaptureIds.push(capture.id);
  });

  // 10. Invoke captures search with basic pagination
  const pageSize: number & tags.Type<"int32"> & tags.Minimum<1> = 2;
  const requestPage = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const searchRequestBody = {
    page: requestPage,
    pageSize,
    sortKey: undefined,
    sortOrder: undefined,
    status: undefined,
    minAmount: undefined,
    maxAmount: undefined,
    fromCapturedAt: undefined,
    toCapturedAt: undefined,
    gatewayReference: undefined,
  } satisfies IShoppingMallPaymentCapture.IRequest;

  const pageResult: IPageIShoppingMallPaymentCapture.ISummary =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.index(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: searchRequestBody,
      },
    );
  typia.assert(pageResult);

  const pagination = pageResult.pagination;
  const data = pageResult.data;

  // 11. Validate pagination metadata
  TestValidator.equals(
    "pagination.limit equals requested pageSize",
    pagination.limit,
    pageSize,
  );

  TestValidator.predicate(
    "pagination.records should be at least number of created captures",
    pagination.records >= createdCaptureIds.length,
  );

  TestValidator.predicate(
    "pagination.pages is consistent with records and limit",
    pagination.pages ===
      (pagination.records === 0
        ? 0
        : Math.ceil(pagination.records / pagination.limit)),
  );

  TestValidator.equals(
    "pagination.current is zero-based index of requested page",
    pagination.current,
    requestPage - 1,
  );

  // 12. Validate data length and content
  TestValidator.predicate(
    "data length is > 0 and <= pageSize",
    data.length > 0 && data.length <= pageSize,
  );

  await ArrayUtil.asyncForEach(data, async (summary) => {
    TestValidator.equals(
      "summary.payment_transaction.id matches paymentTransaction.id",
      summary.payment_transaction.id,
      paymentTransaction.id,
    );

    TestValidator.equals(
      "capture currency matches transaction currency",
      summary.currency,
      paymentTransaction.currency,
    );

    TestValidator.predicate(
      "capture id from page is one of created capture ids",
      createdCaptureIds.includes(summary.id),
    );
  });
}
