import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallChargebackStatusStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChargebackStatusStatistics";
import type { IShoppingMallChargebackStatusStatisticsItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChargebackStatusStatisticsItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPaymentChargeback } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentChargeback";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that platform admin chargeback-by-status statistics aggregate
 * correctly across multiple statuses.
 *
 * Business flow:
 *
 * 1. Register a platform admin and obtain an authorized admin context.
 * 2. Register and login a customer for customer cart and order APIs.
 * 3. As admin, create category tree, brand, product, and SKU.
 * 4. As customer, create a cart, add the SKU as an item, and place an order based
 *    on that cart.
 * 5. As admin, create a payment method.
 * 6. Create two payment transactions for the same order using that payment method.
 * 7. Create two chargebacks with distinct statuses and disputed amounts, each
 *    attached to a different transaction.
 * 8. Call GET /shoppingMall/platformAdmin/statistics/chargebacks-by-status.
 * 9. Assert that statistics contain a bucket per status with correct
 *    chargebackCount and totalDisputedAmount, and that the sum across buckets
 *    matches the underlying chargebacks.
 */
export async function test_api_platform_admin_chargeback_statistics_multiple_statuses(
  connection: api.IConnection,
) {
  // 1. Join platform admin (auto-authenticated via SDK)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinRequest = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuth: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(adminAuth);

  // 2. Join & login customer
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerJoinRequest = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinRequest,
    });
  typia.assert(customerAuth);

  // Explicit login (ensures token refresh and login flow is valid)
  const customerLoginRequest = {
    email: customerEmail,
    password: customerJoinRequest.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerAuth2: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginRequest,
    });
  typia.assert(customerAuth2);

  // 3. Switch back to platform admin explicitly (login) to ensure admin token
  const adminLoginRequest = {
    email: adminEmail,
    password: adminJoinRequest.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminAuth2: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginRequest,
    });
  typia.assert(adminAuth2);

  // 3-1. Create category tree (even if not strictly required by downstream endpoints)
  const categoryTreeRequest = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog Tree",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeRequest,
      },
    );
  typia.assert(categoryTree);

  // 3-2. Create brand
  const brandRequest = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandRequest,
    });
  typia.assert(brand);

  // 3-3. Create product owned by some seller (we only know seller id from type; use a random placeholder UUID)
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productCode = `prod-${RandomGenerator.alphaNumeric(10)}` as string;
  const productRequest = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: RandomGenerator.name(3) as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productRequest,
      },
    );
  typia.assert(product);

  // 3-4. Create a SKU for the product
  const skuCode = `sku-${RandomGenerator.alphaNumeric(10)}`;
  const skuRequest = {
    code: skuCode,
    name: "Default SKU",
    listPrice: 10000,
    salePrice: 9000,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode,
        body: skuRequest,
      },
    );
  typia.assert(sku);

  // 4. Switch to customer (login already done) and create cart
  const cartRequest = {
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
        body: cartRequest,
      },
    );
  typia.assert(cart);

  // 4-1. Add item to cart
  const cartItemRequest = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "test item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemRequest,
      },
    );
  typia.assert(cartItem);

  // 4-2. Create order from cart (simple coherent monetary data)
  const itemsSubtotal = 9000;
  const discountTotal = 0;
  const shippingTotal = 1000;
  const taxTotal = 1000;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const orderRequest = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Please deliver promptly",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderRequest,
    });
  typia.assert(order);

  // 5. Switch back to platform admin (login once more to be explicit)
  const adminAuth3: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginRequest,
    });
  typia.assert(adminAuth3);

  // 6. Create payment method
  const paymentMethodRequest = {
    code: `pm-${RandomGenerator.alphaNumeric(8)}`,
    display_name: "Test Card",
    description: "E2E test payment method",
    provider_key: "test-gateway",
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
        body: paymentMethodRequest,
      },
    );
  typia.assert(paymentMethod);

  // 7. Create two payment transactions for the same order
  const baseCurrency: string & tags.MinLength<3> & tags.MaxLength<3> =
    order.currency_code as string & tags.MinLength<3> & tags.MaxLength<3>;

  const tx1Request = {
    orderId: order.id,
    customerId: order.customer_id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: `intent-${RandomGenerator.alphaNumeric(8)}`,
    providerName: "test-gateway",
    providerTransactionId: `tx1-${RandomGenerator.alphaNumeric(8)}`,
    currency: baseCurrency,
    authorizedAmount: grandTotal,
    capturedAmount: grandTotal,
    paymentStatus: "payment_captured",
    providerStatus: "captured",
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: false,
    metadataJson: null,
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  const tx1: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      {
        body: tx1Request,
      },
    );
  typia.assert(tx1);

  const tx2Request = {
    orderId: order.id,
    customerId: order.customer_id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: `intent-${RandomGenerator.alphaNumeric(8)}`,
    providerName: "test-gateway",
    providerTransactionId: `tx2-${RandomGenerator.alphaNumeric(8)}`,
    currency: baseCurrency,
    authorizedAmount: grandTotal,
    capturedAmount: grandTotal,
    paymentStatus: "payment_captured",
    providerStatus: "captured",
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: false,
    metadataJson: null,
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  const tx2: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      {
        body: tx2Request,
      },
    );
  typia.assert(tx2);

  // 8. Create two chargebacks with distinct statuses and disputed amounts
  const disputedAmount1 = 3000 as number & tags.Minimum<0>;
  const disputedAmount2 = 5000 as number & tags.Minimum<0>;

  const status1 = "chargeback_open";
  const status2 = "chargeback_resolved";

  const chargeback1Request = {
    paymentTransactionId: tx1.id,
    orderId: order.id,
    caseReference: `CB-${RandomGenerator.alphaNumeric(8)}`,
    providerCaseId: `PCB-${RandomGenerator.alphaNumeric(8)}`,
    disputedAmount: disputedAmount1,
    currency: baseCurrency,
    status: status1,
    reasonCode: "FRAUD",
    reasonMessage: "Fraudulent transaction reported",
    openedAt: new Date().toISOString() as string & tags.Format<"date-time">,
  } satisfies IShoppingMallPaymentChargeback.ICreate;

  const cb1: IShoppingMallPaymentChargeback =
    await api.functional.shoppingMall.platformAdmin.paymentChargebacks.create(
      connection,
      {
        body: chargeback1Request,
      },
    );
  typia.assert(cb1);

  const chargeback2Request = {
    paymentTransactionId: tx2.id,
    orderId: order.id,
    caseReference: `CB-${RandomGenerator.alphaNumeric(8)}`,
    providerCaseId: `PCB-${RandomGenerator.alphaNumeric(8)}`,
    disputedAmount: disputedAmount2,
    currency: baseCurrency,
    status: status2,
    reasonCode: "NON_RECEIPT",
    reasonMessage: "Goods not received",
    openedAt: new Date().toISOString() as string & tags.Format<"date-time">,
  } satisfies IShoppingMallPaymentChargeback.ICreate;

  const cb2: IShoppingMallPaymentChargeback =
    await api.functional.shoppingMall.platformAdmin.paymentChargebacks.create(
      connection,
      {
        body: chargeback2Request,
      },
    );
  typia.assert(cb2);

  // 9. Ensure we are authenticated as platform admin for statistics call
  const adminAuth4: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginRequest,
    });
  typia.assert(adminAuth4);

  // 10. Call statistics endpoint
  const stats: IShoppingMallChargebackStatusStatistics =
    await api.functional.shoppingMall.platformAdmin.statistics.chargebacks_by_status.index(
      connection,
    );
  typia.assert(stats);

  // 11. Locate buckets for both statuses
  const bucket1: IShoppingMallChargebackStatusStatisticsItem | undefined =
    stats.items.find((item) => item.status === status1);
  const bucket2: IShoppingMallChargebackStatusStatisticsItem | undefined =
    stats.items.find((item) => item.status === status2);

  TestValidator.predicate(
    "statistics should contain bucket for first chargeback status",
    bucket1 !== undefined,
  );
  TestValidator.predicate(
    "statistics should contain bucket for second chargeback status",
    bucket2 !== undefined,
  );

  if (!bucket1 || !bucket2) return;

  // 12. Validate per-status aggregates
  TestValidator.equals(
    "chargeback count for status1 should be 1",
    bucket1.chargebackCount,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals(
    "chargeback count for status2 should be 1",
    bucket2.chargebackCount,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  TestValidator.equals(
    "total disputed amount for status1 should equal chargeback1 disputedAmount",
    bucket1.totalDisputedAmount,
    disputedAmount1,
  );
  TestValidator.equals(
    "total disputed amount for status2 should equal chargeback2 disputedAmount",
    bucket2.totalDisputedAmount,
    disputedAmount2,
  );

  const totalFromBuckets =
    bucket1.totalDisputedAmount + bucket2.totalDisputedAmount;
  const totalFromChargebacks = disputedAmount1 + disputedAmount2;

  TestValidator.equals(
    "sum of per-status disputed amounts equals sum of underlying chargebacks",
    totalFromBuckets,
    totalFromChargebacks,
  );
}
