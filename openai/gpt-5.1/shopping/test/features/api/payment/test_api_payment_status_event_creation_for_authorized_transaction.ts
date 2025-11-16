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

export async function test_api_payment_status_event_creation_for_authorized_transaction(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join)
  const platformAdminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    name: RandomGenerator.name(),
    password: "AdminPass!234",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Basic catalog configuration as platform admin
  // 2-1. Category tree (not strictly required but keeps setup realistic)
  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphabets(6)}`,
    name: "Default Catalog Tree",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeCreateBody },
    );
  typia.assert(categoryTree);

  // 2-2. Brand
  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphabets(6)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Seller join (actor: seller)
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.example.com`,
    password: "SellerPass!234",
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 4. As platform admin, create product owned by the seller
  //    (platform admin is still authenticated from step 1 because
  //     seller.join uses the same connection but overwrites Authorization,
  //     so we must login again as platformAdmin.)

  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  const productCode = `prod-${RandomGenerator.alphabets(8)}`;

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product ${RandomGenerator.name(1)}`,
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
      { body: productCreateBody },
    );
  typia.assert(product);

  // 5. Create SKU for the product
  const skuCode = `sku-${RandomGenerator.alphabets(6)}`;
  const listPrice = 10000;
  const salePrice = 9000;

  const skuCreateBody = {
    code: skuCode,
    name: `SKU ${RandomGenerator.name(1)}`,
    listPrice,
    salePrice,
    currency: "KRW",
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

  // 6. Seller inventory for the SKU
  //    Switch to seller again
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100,
    low_stock_threshold: 10,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventoryItem);

  // 7. Customer join and cart / order creation
  const customerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@customer.example.com`,
    password: "CustomerPass!234",
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // Create customer cart
  const customerCartCreateBody = {
    currency_code: sku.currency,
    region_code: "KR-Seoul",
    channel: "web",
    metadata: {
      source: "e2e-test",
    },
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

  // Add cart item referencing the SKU
  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 1,
    note: "test line item",
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

  // Create order from cart
  const orderSubtotal = salePrice * cartItem.quantity;
  const orderDiscount = 0;
  const orderShipping = 0;
  const orderTax = 0;
  const orderGrandTotal =
    orderSubtotal - orderDiscount + orderShipping + orderTax;

  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  const billingAddressId = typia.random<string & tags.Format<"uuid">>();

  const orderCreateBody = {
    customer_cart_id: customerCart.id,
    currency_code: sku.currency,
    items_subtotal_amount: orderSubtotal,
    discount_total_amount: orderDiscount,
    shipping_total_amount: orderShipping,
    tax_total_amount: orderTax,
    grand_total_amount: orderGrandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "e2e payment status event test",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 8. Platform admin login again to work with payments
  const platformAdminReLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminReLogin);

  // 8-1. Create payment method
  const paymentMethodCode = `method-${RandomGenerator.alphabets(6)}`;

  const now = new Date();
  const startsAt = new Date(now.getTime() - 60_000).toISOString();
  const endsAt = new Date(now.getTime() + 24 * 60 * 60_000).toISOString();

  const paymentMethodCreateBody = {
    code: paymentMethodCode,
    display_name: "Test Card Gateway",
    description: "E2E Test Payment Method",
    provider_key: "test-gateway",
    method_type: "card",
    currency_restriction: null,
    min_amount: null,
    max_amount: null,
    priority: 1,
    is_active: true,
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      { body: paymentMethodCreateBody },
    );
  typia.assert(paymentMethod);

  // 8-2. Create payment transaction with initial status payment_authorized
  const paymentTransactionCreateBody = {
    orderId: order.id,
    customerId: customerAuthorized.id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: `intent-${RandomGenerator.alphaNumeric(12)}`,
    providerName: "test-provider",
    providerTransactionId: `txn-${RandomGenerator.alphaNumeric(10)}`,
    currency: sku.currency as string & tags.MinLength<3> & tags.MaxLength<3>,
    authorizedAmount: orderGrandTotal,
    capturedAmount: null,
    paymentStatus: "payment_authorized",
    providerStatus: "AUTHORIZED",
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: false,
    metadataJson: JSON.stringify({ via: "e2e" }),
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  const paymentTransaction: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      {
        body: paymentTransactionCreateBody,
      },
    );
  typia.assert(paymentTransaction);

  TestValidator.equals(
    "payment transaction initial status is authorized",
    paymentTransaction.paymentStatus,
    paymentTransactionCreateBody.paymentStatus,
  );
  TestValidator.equals(
    "payment transaction order linkage",
    paymentTransaction.orderId,
    order.id,
  );

  // 9. Create payment status event moving to payment_captured
  const newStatus = "payment_captured";
  const previousStatus = paymentTransaction.paymentStatus;

  const statusEventCreateBody = {
    previous_status: previousStatus,
    new_status: newStatus,
    event_type: "manual_update",
    provider_event_code: "CAPTURED",
    provider_reference: `evt-${RandomGenerator.alphaNumeric(10)}`,
    notes: "Captured by E2E test scenario",
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

  // 10. Validate status event fields
  TestValidator.equals(
    "status event is linked to correct transaction id",
    statusEvent.payment_transaction_id,
    paymentTransaction.id,
  );

  TestValidator.equals(
    "embedded paymentTransaction summary id matches",
    statusEvent.paymentTransaction.id,
    paymentTransaction.id,
  );

  TestValidator.equals(
    "status event new_status matches requested",
    statusEvent.new_status,
    statusEventCreateBody.new_status,
  );

  // previous_status may be null or the requested previousStatus depending on
  // server behavior; when server echoes previous_status, it must match our
  // request; if null, we only assert type via typia.assert above.
  if (
    statusEvent.previous_status !== null &&
    statusEvent.previous_status !== undefined
  ) {
    TestValidator.equals(
      "status event previous_status equals initial transaction status",
      statusEvent.previous_status,
      previousStatus,
    );
  }

  TestValidator.equals(
    "status event event_type persisted",
    statusEvent.event_type,
    statusEventCreateBody.event_type,
  );

  TestValidator.equals(
    "status event provider_event_code persisted",
    statusEvent.provider_event_code,
    statusEventCreateBody.provider_event_code,
  );

  TestValidator.equals(
    "status event provider_reference persisted",
    statusEvent.provider_reference,
    statusEventCreateBody.provider_reference,
  );

  TestValidator.equals(
    "status event notes persisted",
    statusEvent.notes,
    statusEventCreateBody.notes,
  );

  // created_at already type-validated by typia.assert; we only sanity check
  // that it is not an empty string.
  TestValidator.predicate(
    "status event created_at is non-empty string",
    statusEvent.created_at.length > 0,
  );
}
