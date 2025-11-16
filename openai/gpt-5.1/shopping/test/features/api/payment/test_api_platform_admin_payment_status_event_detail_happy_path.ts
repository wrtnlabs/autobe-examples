import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
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

export async function test_api_platform_admin_payment_status_event_detail_happy_path(
  connection: api.IConnection,
) {
  // 1. Bootstrap platform admin
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuth: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuth);

  const platformAdminEmail = platformAdminJoinBody.email;
  const platformAdminPassword = platformAdminJoinBody.password;

  // 2. Bootstrap customer
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  const customerId = customerAuth.id;

  // 3. Catalog setup as platform admin
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      email: platformAdminEmail,
      password: platformAdminPassword,
      ip: null,
      href: "https://admin.shoppingmall.test/login",
      referrer: "https://shoppingmall.test/landing",
    } satisfies IShoppingMallPlatformAdminLogin.IRequest,
  });

  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog",
    description: "Primary category tree for all products",
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeBody,
      },
    );
  typia.assert(categoryTree);

  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: "https://cdn.shoppingmall.test/logos/sample-brand.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  const productCode = `prod-${RandomGenerator.alphaNumeric(10)}`;

  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.shoppingmall.test/products/sample-product-primary.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBody,
      },
    );
  typia.assert(product);

  const skuBody = {
    code: `sku-${RandomGenerator.alphaNumeric(8)}`,
    name: `SKU ${RandomGenerator.name(1)}`,
    listPrice: 100,
    salePrice: 80,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode,
        body: skuBody,
      },
    );
  typia.assert(sku);

  // 4. Customer cart and order flow as customer
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerJoinBody.email,
      password: customerJoinBody.password,
      ip: null,
      href: "https://shoppingmall.test/login",
      referrer: "https://shoppingmall.test/landing",
    } satisfies IShoppingMallCustomerAuth.ILogin,
  });

  const cartBody = {
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
        body: cartBody,
      },
    );
  typia.assert(cart);

  const cartItemBody = {
    skuId: sku.id,
    quantity: 1,
    note: "Test item for payment transaction",
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

  const orderSubtotal = 80;
  const orderDiscount = 0;
  const orderShipping = 0;
  const orderTax = 0;
  const orderGrandTotal =
    orderSubtotal - orderDiscount + orderShipping + orderTax;

  const orderBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: orderSubtotal,
    discount_total_amount: orderDiscount,
    shipping_total_amount: orderShipping,
    tax_total_amount: orderTax,
    grand_total_amount: orderGrandTotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "E2E payment transaction order",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  TestValidator.equals(
    "order should belong to the authenticated customer",
    order.customer_id,
    customerId,
  );

  // 5. Payment method and transaction as platform admin
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      email: platformAdminEmail,
      password: platformAdminPassword,
      ip: null,
      href: "https://admin.shoppingmall.test/login",
      referrer: "https://shoppingmall.test/landing",
    } satisfies IShoppingMallPlatformAdminLogin.IRequest,
  });

  const paymentMethodCode = `card-${RandomGenerator.alphaNumeric(6)}`;

  const paymentMethodBody = {
    code: paymentMethodCode,
    display_name: "Credit Card",
    description: "Standard credit card payment method for tests",
    provider_key: "test-gateway",
    method_type: "card",
    currency_restriction: "USD",
    min_amount: 1,
    max_amount: 100000,
    priority: 1,
    is_active: true,
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      {
        body: paymentMethodBody,
      },
    );
  typia.assert(paymentMethod);

  const paymentTransactionBody = {
    orderId: order.id,
    customerId,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: null,
    providerName: "test-gateway",
    providerTransactionId: null,
    currency: cart.currency_code,
    authorizedAmount: orderGrandTotal,
    capturedAmount: null,
    paymentStatus: "payment_authorized",
    providerStatus: "AUTHORIZED",
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

  // 6. Create a payment status event
  const newStatus = "payment_captured";
  const eventType = "manual_update";
  const providerEventCode = "CAPTURED";
  const providerReference = `evt_${RandomGenerator.alphaNumeric(10)}`;
  const notes = "Captured payment in full via E2E test.";

  const statusEventCreateBody = {
    previous_status: paymentTransaction.paymentStatus,
    new_status: newStatus,
    event_type: eventType,
    provider_event_code: providerEventCode,
    provider_reference: providerReference,
    notes,
  } satisfies IShoppingMallPaymentStatusEvent.ICreate;

  const createdStatusEvent: IShoppingMallPaymentStatusEvent =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.statusEvents.create(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: statusEventCreateBody,
      },
    );
  typia.assert(createdStatusEvent);

  TestValidator.equals(
    "created status event should belong to the payment transaction",
    createdStatusEvent.payment_transaction_id,
    paymentTransaction.id,
  );

  // 7. Retrieve the payment status event detail
  const fetchedStatusEvent: IShoppingMallPaymentStatusEvent =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.statusEvents.at(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        statusEventId: createdStatusEvent.id,
      },
    );
  typia.assert(fetchedStatusEvent);

  // Validate core identity and relationship fields
  TestValidator.equals(
    "status event id should match requested id",
    fetchedStatusEvent.id,
    createdStatusEvent.id,
  );
  TestValidator.equals(
    "status event payment_transaction_id should match payment transaction",
    fetchedStatusEvent.payment_transaction_id,
    paymentTransaction.id,
  );
  TestValidator.equals(
    "embedded paymentTransaction.id should match payment transaction",
    fetchedStatusEvent.paymentTransaction.id,
    paymentTransaction.id,
  );

  // Validate business fields match creation payload
  TestValidator.equals(
    "new_status should match the created event",
    fetchedStatusEvent.new_status,
    newStatus,
  );
  TestValidator.equals(
    "event_type should match the created event",
    fetchedStatusEvent.event_type,
    eventType,
  );
  TestValidator.equals(
    "provider_event_code should match the created event",
    fetchedStatusEvent.provider_event_code,
    providerEventCode,
  );
  TestValidator.equals(
    "provider_reference should match the created event",
    fetchedStatusEvent.provider_reference,
    providerReference,
  );
  TestValidator.equals(
    "notes should match the created event",
    fetchedStatusEvent.notes,
    notes,
  );

  // Sanity: created_at should be a valid ISO timestamp and unchanged
  TestValidator.equals(
    "created_at should be stable between create and fetch",
    fetchedStatusEvent.created_at,
    createdStatusEvent.created_at,
  );
}
