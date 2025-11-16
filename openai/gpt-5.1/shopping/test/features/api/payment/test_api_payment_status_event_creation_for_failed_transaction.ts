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
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
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
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_payment_status_event_creation_for_failed_transaction(
  connection: api.IConnection,
) {
  // 1. Register and login platform admin
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoginResult: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginResult);

  // 2. Register and login seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SellerPass123!",
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoginResult: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginResult);

  // 3. Register and login customer
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "CustomerPass123!",
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
    userAgent: "E2E-Test-Agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoginResult: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginResult);

  // Switch back to platformAdmin for catalog/payment-method setup
  const relogPlatformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(relogPlatformAdmin);

  // 4. Catalog setup as platformAdmin
  const categoryTreeBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
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
    name: RandomGenerator.paragraph({ sentences: 1 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  const productCode = RandomGenerator.alphaNumeric(10);
  const productBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
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

  const skuCode = RandomGenerator.alphaNumeric(8);
  const skuBody = {
    code: skuCode,
    name: RandomGenerator.paragraph({ sentences: 1 }),
    listPrice: 100,
    salePrice: 100,
    currency: "USD",
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

  // 5. Inventory setup as seller
  const relogSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(relogSeller);

  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 10,
    low_stock_threshold: 2,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventoryItem);

  // 6. Checkout flow as customer
  const relogCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(relogCustomer);

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
    note: "E2E test item",
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

  const orderSubtotal = cart.subtotal_amount;
  const orderDiscount = cart.discount_amount;
  const orderShipping = cart.shipping_amount;
  const orderTax = cart.tax_amount;
  const orderGrandTotal = cart.total_amount;

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
    customer_note: "E2E order for failed payment transaction",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 7. Payment method + failed transaction as platformAdmin
  const relogPlatformAdmin2: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(relogPlatformAdmin2);

  const paymentMethodBody = {
    code: RandomGenerator.alphaNumeric(6),
    display_name: "Test Credit Card",
    description: "E2E test payment method",
    provider_key: "test-gateway",
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
      {
        body: paymentMethodBody,
      },
    );
  typia.assert(paymentMethod);

  const failedStatus = "payment_failed";

  const paymentTransactionBody = {
    orderId: order.id,
    customerId: order.customer_id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: RandomGenerator.alphaNumeric(16),
    providerName: paymentMethodBody.provider_key,
    providerTransactionId: RandomGenerator.alphaNumeric(12),
    currency: cart.currency_code,
    authorizedAmount: null,
    capturedAmount: null,
    paymentStatus: failedStatus,
    providerStatus: "FAILED",
    failureReasonCode: "card_declined",
    failureReasonMessage: "Card was declined by issuer",
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

  TestValidator.equals(
    "payment transaction should be in failed status",
    paymentTransaction.paymentStatus,
    failedStatus,
  );

  // 8. Create additional failure-related status event
  const statusEventRequest = {
    previous_status: failedStatus,
    new_status: failedStatus,
    event_type: "provider_webhook",
    provider_event_code: "webhook_failure_duplicate",
    provider_reference: RandomGenerator.alphaNumeric(20),
    notes: "Second failure notification received from provider webhook.",
  } satisfies IShoppingMallPaymentStatusEvent.ICreate;

  const statusEvent: IShoppingMallPaymentStatusEvent =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.statusEvents.create(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: statusEventRequest,
      },
    );
  typia.assert(statusEvent);

  // 9. Business assertions on returned status event
  TestValidator.equals(
    "status event should reference the correct payment transaction",
    statusEvent.payment_transaction_id,
    paymentTransaction.id,
  );

  TestValidator.equals(
    "status event summary transaction id should match",
    statusEvent.paymentTransaction.id,
    paymentTransaction.id,
  );

  TestValidator.equals(
    "status event new_status should match requested value",
    statusEvent.new_status,
    statusEventRequest.new_status,
  );

  TestValidator.equals(
    "status event previous_status should match requested value",
    statusEvent.previous_status ?? null,
    statusEventRequest.previous_status ?? null,
  );

  TestValidator.equals(
    "status event event_type should match requested value",
    statusEvent.event_type,
    statusEventRequest.event_type,
  );

  TestValidator.equals(
    "status event provider_event_code should match",
    statusEvent.provider_event_code ?? null,
    statusEventRequest.provider_event_code ?? null,
  );

  TestValidator.equals(
    "status event provider_reference should match",
    statusEvent.provider_reference ?? null,
    statusEventRequest.provider_reference ?? null,
  );

  TestValidator.equals(
    "status event notes should match",
    statusEvent.notes ?? null,
    statusEventRequest.notes ?? null,
  );
}
