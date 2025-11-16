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
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Happy-path retrieval of a payment transaction by platform admin.
 *
 * This E2E verifies that after a full minimal purchase flow (admin config →
 * customer cart/order → admin payment transaction create), the platform admin
 * can successfully retrieve the exact payment transaction by its ID using the
 * GET /shoppingMall/platformAdmin/paymentTransactions/{paymentTransactionId}
 * endpoint. It focuses on data consistency between the create and get responses
 * and on linkage with the originating order and payment method.
 */
export async function test_api_platform_admin_payment_transaction_retrieval_happy_path(
  connection: api.IConnection,
) {
  // 1. Platform admin join (auto-authenticates and sets Authorization header)
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: "AdminPassword!123",
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a category tree (not strictly required by DTO relations but
  // kept to reflect scenario; we don't have to use its id further)
  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Default Category Tree",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeCreateBody },
    );
  typia.assert(categoryTree);

  // 3. Create a brand
  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(10)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.shoppingmall.local/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4. Create a product (note: IShoppingMallProduct.ICreate requires
  // shopping_mall_seller_id even though we don't have a seller API here.
  // For E2E we will just use a random UUID; backend may accept it in
  // simulation mode.)
  const fakeSellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productCode: string = `prod-${RandomGenerator.alphaNumeric(10)}`;
  const productCreateBody = {
    shopping_mall_seller_id: fakeSellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: "Test Product",
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.shoppingmall.local/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productCreateBody },
    );
  typia.assert(product);

  // 5. Create a SKU under this product
  const skuCreateBody = {
    code: `sku-${RandomGenerator.alphaNumeric(8)}`,
    name: "Default Variant",
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

  // 6. Create a payment method
  const paymentMethodCode = `pm-${RandomGenerator.alphaNumeric(8)}`;
  const now = new Date();
  const inOneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const paymentMethodCreateBody = {
    code: paymentMethodCode,
    display_name: "Test Credit Card",
    description: "Test payment method for E2E",
    provider_key: "test-gateway",
    method_type: "card",
    currency_restriction: null,
    min_amount: null,
    max_amount: null,
    priority: 1,
    is_active: true,
    starts_at: now.toISOString(),
    ends_at: inOneWeek.toISOString(),
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      { body: paymentMethodCreateBody },
    );
  typia.assert(paymentMethod);

  // 7. Register a customer (join)
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPassword!123",
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

  // 8. Create a customer cart
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
      { body: customerCartCreateBody },
    );
  typia.assert(customerCart);

  // 9. Add an item to the cart using the created SKU
  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "E2E test item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: customerCart.id as string & tags.Format<"uuid">,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);

  // 10. Create an order from the cart.
  // Use amounts consistent with SKU price * quantity and simple zero discounts
  // and shipping/tax for a minimal happy path.
  const itemsSubtotalAmount = sku.salePrice * cartItem.quantity;
  const discountTotalAmount = 0;
  const shippingTotalAmount = 0;
  const taxTotalAmount = 0;
  const grandTotalAmount =
    itemsSubtotalAmount -
    discountTotalAmount +
    shippingTotalAmount +
    taxTotalAmount;

  const shippingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const billingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const orderCreateBody = {
    customer_cart_id: customerCart.id,
    currency_code: customerCart.currency_code,
    items_subtotal_amount: itemsSubtotalAmount,
    discount_total_amount: discountTotalAmount,
    shipping_total_amount: shippingTotalAmount,
    tax_total_amount: taxTotalAmount,
    grand_total_amount: grandTotalAmount,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "Please deliver quickly",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // Simple monetary consistency checks between cart snapshot and order
  TestValidator.equals(
    "order currency matches cart currency",
    order.currency_code,
    customerCart.currency_code,
  );
  TestValidator.equals(
    "order items_subtotal_amount equals expected subtotal",
    order.items_subtotal_amount,
    itemsSubtotalAmount,
  );
  TestValidator.equals(
    "order grand_total_amount equals expected grand total",
    order.grand_total_amount,
    grandTotalAmount,
  );

  // 11. Switch back to platform admin context.
  // After customer.join, connection Authorization points to customer; we need
  // to log in again as the platform admin to ensure admin-level privileges for
  // payment transaction creation and retrieval.
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: "AdminPassword!123",
    ip: null,
    href: "https://admin.shoppingmall.local/login",
    referrer: "https://admin.shoppingmall.local/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminRelogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminRelogin);

  // 12. Create a payment transaction linked to the order and payment method
  const paymentTransactionCreateBody = {
    orderId: order.id,
    customerId: order.customer_id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: `intent-${RandomGenerator.alphaNumeric(12)}`,
    providerName: paymentMethod.provider_key ?? "test-gateway",
    providerTransactionId: `tx-${RandomGenerator.alphaNumeric(16)}`,
    currency: order.currency_code as string &
      tags.MinLength<3> &
      tags.MaxLength<3>,
    authorizedAmount: order.grand_total_amount,
    capturedAmount: order.grand_total_amount,
    paymentStatus: "payment_captured",
    providerStatus: "captured",
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: false,
    metadataJson: null,
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  const createdTransaction: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      { body: paymentTransactionCreateBody },
    );
  typia.assert(createdTransaction);

  // 13. Retrieve the payment transaction by ID
  const fetchedTransaction: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.at(
      connection,
      {
        paymentTransactionId: createdTransaction.id,
      },
    );
  typia.assert(fetchedTransaction);

  // 14. Assertions: identity equality and linkage consistency
  TestValidator.equals(
    "fetched transaction matches created id",
    fetchedTransaction.id,
    createdTransaction.id,
  );
  TestValidator.equals(
    "transaction.orderId equals originating order id",
    fetchedTransaction.orderId,
    order.id,
  );
  TestValidator.equals(
    "transaction.paymentMethodId equals created payment method id",
    fetchedTransaction.paymentMethodId,
    paymentMethod.id,
  );
  TestValidator.equals(
    "transaction.currency equals order currency",
    fetchedTransaction.currency,
    order.currency_code,
  );
  TestValidator.equals(
    "transaction.paymentStatus is captured",
    fetchedTransaction.paymentStatus,
    "payment_captured",
  );
  TestValidator.equals(
    "transaction.refundedAmount equals zero on initial capture",
    fetchedTransaction.refundedAmount,
    0,
  );
  TestValidator.equals(
    "transaction.requiresManualReview is false",
    fetchedTransaction.requiresManualReview,
    false,
  );

  // If paymentMethod summary is present on the transaction, ensure core fields
  // align with the configuration we created.
  if (fetchedTransaction.paymentMethod !== undefined) {
    TestValidator.equals(
      "transaction.paymentMethod.id equals paymentMethod.id",
      fetchedTransaction.paymentMethod.id,
      paymentMethod.id,
    );
    TestValidator.equals(
      "transaction.paymentMethod.code equals paymentMethod.code",
      fetchedTransaction.paymentMethod.code,
      paymentMethod.code,
    );
  }
}
