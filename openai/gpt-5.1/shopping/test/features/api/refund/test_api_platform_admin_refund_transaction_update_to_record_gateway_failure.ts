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
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallRefundTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundTransaction";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that a platform admin can update an existing refund transaction to
 * record a payment gateway failure after an attempted refund.
 *
 * Business flow:
 *
 * 1. Platform admin joins and becomes authenticated.
 * 2. Admin creates a category tree, brand, product, and SKU to support a realistic
 *    purchase flow.
 * 3. A customer joins and authenticates.
 * 4. Customer creates a cart, adds the SKU, and creates an order.
 * 5. Admin logs back in, creates a payment method and a payment transaction for
 *    the order.
 * 6. Admin creates a refund transaction in a pending status linked to the payment
 *    transaction and order.
 * 7. Admin updates the refund transaction via the platformAdmin
 *    refundTransactions.update endpoint to a failure status and records
 *    provider failure metadata.
 * 8. Test asserts that the refund transaction reflects the failure status and
 *    metadata, while core linkage and requested/refunded amounts remain
 *    consistent.
 */
export async function test_api_platform_admin_refund_transaction_update_to_record_gateway_failure(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and becomes authenticated
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates a category tree
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog Tree",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  // 3. Admin creates a brand
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logos/brand.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 4. Admin creates a product
  const productCode: string & tags.MinLength<1> =
    `prod-${RandomGenerator.alphaNumeric(10)}` as string & tags.MinLength<1>;

  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product ${RandomGenerator.name(2)}`,
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/products/primary.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productBody },
    );
  typia.assert(product);

  // 5. Admin creates a SKU variant for that product
  const skuBody = {
    code: `sku-${RandomGenerator.alphaNumeric(8)}`,
    name: `SKU ${RandomGenerator.name(1)}`,
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

  // 6. Customer joins and authenticates
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword: string = RandomGenerator.alphaNumeric(12);

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
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

  // 7. Customer creates a cart
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
      { body: cartBody },
    );
  typia.assert(cart);

  // 8. Customer adds SKU to cart
  const cartItemBody = {
    skuId: sku.id,
    quantity: 1,
    note: "Test purchase item",
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

  // 9. Customer creates an order
  const itemsSubtotalAmount = 100;
  const discountTotalAmount = 0;
  const shippingTotalAmount = 0;
  const taxTotalAmount = 0;
  const grandTotalAmount =
    itemsSubtotalAmount +
    shippingTotalAmount +
    taxTotalAmount -
    discountTotalAmount;

  const shippingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const billingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const orderBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotalAmount,
    discount_total_amount: discountTotalAmount,
    shipping_total_amount: shippingTotalAmount,
    tax_total_amount: taxTotalAmount,
    grand_total_amount: grandTotalAmount,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "Please deliver quickly.",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 10. Switch back to platform admin authentication via login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLoginAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 11. Admin creates a payment method
  const paymentMethodBody = {
    code: `card-${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Credit Card",
    description: "Standard card payments",
    provider_key: "pgw-card-provider",
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

  // 12. Admin creates a payment transaction for the order
  const paymentCurrency: string & tags.MinLength<3> & tags.MaxLength<3> =
    order.currency_code as string & tags.MinLength<3> & tags.MaxLength<3>;

  const authorizedAmount = grandTotalAmount;
  const capturedAmount = grandTotalAmount;

  const paymentTransactionBody = {
    orderId: order.id,
    customerId: order.customer_id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: `pi_${RandomGenerator.alphaNumeric(10)}`,
    providerName: paymentMethod.provider_key ?? "card-provider",
    providerTransactionId: `tx_${RandomGenerator.alphaNumeric(12)}`,
    currency: paymentCurrency,
    authorizedAmount,
    capturedAmount,
    paymentStatus: "payment_captured",
    providerStatus: "CAPTURED",
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: false,
    metadataJson: null,
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  const paymentTransaction: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      { body: paymentTransactionBody },
    );
  typia.assert(paymentTransaction);

  // 13. Admin creates a refund transaction in pending status
  const refundRequestedAmount = capturedAmount;

  const refundCreateBody = {
    shopping_mall_payment_transaction_id: paymentTransaction.id,
    shopping_mall_order_id: order.id,
    refund_number: `rf_${RandomGenerator.alphaNumeric(10)}`,
    refund_status: "refund_pending",
    actor_type: "admin",
    reason_category: "admin_adjustment",
    reason_message: "Initial refund request for QA test",
    requested_amount: refundRequestedAmount,
    approved_amount: null,
    refunded_amount: null,
    currency: paymentTransaction.currency,
    provider_refund_id: null,
    provider_status: null,
    failure_reason_code: null,
    failure_reason_message: null,
  } satisfies IShoppingMallRefundTransaction.ICreate;

  const createdRefund: IShoppingMallRefundTransaction =
    await api.functional.shoppingMall.refundTransactions.create(connection, {
      body: refundCreateBody,
    });
  typia.assert(createdRefund);

  TestValidator.equals(
    "created refund is linked to the correct payment transaction",
    createdRefund.shopping_mall_payment_transaction_id,
    paymentTransaction.id,
  );
  TestValidator.equals(
    "created refund is linked to the correct order",
    createdRefund.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "created refund requested_amount matches requested",
    createdRefund.requested_amount,
    refundRequestedAmount,
  );
  TestValidator.equals(
    "created refund status is pending",
    createdRefund.refund_status,
    "refund_pending",
  );

  const originalRefundedAmount = createdRefund.refunded_amount ?? null;

  // 14. Admin updates the refund transaction to record gateway failure
  const failureRefundStatus = "refund_failed";
  const providerFailureStatus = "PGW_FAIL";
  const failureReasonCode = "PROVIDER_REJECTED";
  const failureReasonMessage = "Provider rejected refund due to risk rules";

  const refundUpdateBody = {
    refund_status: failureRefundStatus,
    actor_type: null,
    reason_category: null,
    reason_message: null,
    approved_amount: null,
    refunded_amount: originalRefundedAmount,
    provider_refund_id: null,
    provider_status: providerFailureStatus,
    failure_reason_code: failureReasonCode,
    failure_reason_message: failureReasonMessage,
  } satisfies IShoppingMallRefundTransaction.IUpdate;

  const updatedRefund: IShoppingMallRefundTransaction =
    await api.functional.shoppingMall.platformAdmin.refundTransactions.update(
      connection,
      {
        refundTransactionId: createdRefund.id,
        body: refundUpdateBody,
      },
    );
  typia.assert(updatedRefund);

  // 15. Validate updated refund transaction fields
  TestValidator.equals(
    "updated refund id remains the same",
    updatedRefund.id,
    createdRefund.id,
  );
  TestValidator.equals(
    "updated refund still linked to same payment transaction",
    updatedRefund.shopping_mall_payment_transaction_id,
    paymentTransaction.id,
  );
  TestValidator.equals(
    "updated refund still linked to same order",
    updatedRefund.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "refund status transitioned to refund_failed",
    updatedRefund.refund_status,
    failureRefundStatus,
  );
  TestValidator.equals(
    "requested_amount remains unchanged after failure update",
    updatedRefund.requested_amount,
    createdRefund.requested_amount,
  );
  TestValidator.equals(
    "provider_status stored as failure status",
    updatedRefund.provider_status,
    providerFailureStatus,
  );
  TestValidator.equals(
    "failure_reason_code stored correctly",
    updatedRefund.failure_reason_code,
    failureReasonCode,
  );
  TestValidator.equals(
    "failure_reason_message stored correctly",
    updatedRefund.failure_reason_message,
    failureReasonMessage,
  );
  TestValidator.equals(
    "refunded_amount remains unchanged on failure",
    updatedRefund.refunded_amount ?? null,
    originalRefundedAmount,
  );
}
