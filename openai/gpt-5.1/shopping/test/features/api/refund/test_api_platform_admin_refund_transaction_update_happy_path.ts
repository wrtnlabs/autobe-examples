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
 * Happy-path test for updating a refund transaction as a platform administrator
 * after a realistic order and payment flow.
 *
 * Steps:
 *
 * 1. Register a platform admin and obtain an authorized admin session.
 * 2. Create minimal catalog artifacts: category tree, brand, product, and SKU.
 * 3. Register a customer and create a cart for them.
 * 4. Add the SKU to the customer cart.
 * 5. Create an order from the cart with consistent monetary snapshot values.
 * 6. Switch back to platform admin and create a payment method.
 * 7. Create a payment transaction for the order using that payment method.
 * 8. Create an initial refund transaction pointing to the payment transaction and
 *    order.
 * 9. As platform admin, update mutable fields of the refund transaction using the
 *    platform admin refundTransactions.update endpoint:
 *
 *    - Refund_status
 *    - Approved_amount
 *    - Provider_status
 *    - Failure_reason_message
 *    - Reason_message
 * 10. Validate via typia.assert that the updated refund transaction is structurally
 *     correct and via TestValidator that mutable fields changed while immutable
 *     linkage fields (payment transaction id, order id, requested_amount,
 *     currency) remain unchanged.
 */
export async function test_api_platform_admin_refund_transaction_update_happy_path(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join) to get admin Authorization on connection
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminEmail: string = adminAuthorized.email;
  const adminPassword: string = adminJoinBody.password;

  // 2. Optionally login again as platform admin to exercise login path
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminAuthorizedAgain: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedAgain);

  // 3. Create catalog artifacts as platform admin
  // 3-1. Category tree
  const categoryTreeCreate = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeCreate },
    );
  typia.assert(categoryTree);

  // 3-2. Brand
  const brandCreate = {
    name: RandomGenerator.name(1),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreate,
    });
  typia.assert(brand);

  // 3-3. Product (note: seller id is a random UUID because no seller API exists)
  const randomSellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productCreate = {
    shopping_mall_seller_id: randomSellerId,
    shopping_mall_brand_id: brand.id,
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productCreate },
    );
  typia.assert(product);

  // 3-4. SKU under product
  const skuCreate = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
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
        productCode: product.code,
        body: skuCreate,
      },
    );
  typia.assert(sku);

  // 4. Register customer
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
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

  // 5. Create customer cart
  const cartCreate = {
    currency_code: sku.currency,
    region_code: "US",
    channel: "web",
    metadata: undefined,
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      { body: cartCreate },
    );
  typia.assert(cart);

  // 6. Add SKU to customer cart
  const cartItemCreate = {
    skuId: sku.id,
    quantity: 1,
    note: "Refundable test item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemCreate,
      },
    );
  typia.assert(cartItem);

  // 7. Create order from cart with synthetic but consistent amounts
  const itemsSubtotal = 80;
  const discountTotal = 0;
  const shippingTotal = 10;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const shippingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const billingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const orderCreate = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "Please handle with care.",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreate,
    });
  typia.assert(order);

  // 8. Switch back to platform admin by logging in again
  const adminAuthorizedAfterCustomer: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedAfterCustomer);

  // 9. Create payment method as admin
  const paymentMethodCreate = {
    code: `pm_${RandomGenerator.alphaNumeric(8)}`,
    display_name: "Test Credit Card",
    description: "Test payment method for refund update scenario",
    provider_key: "test_gateway",
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
      { body: paymentMethodCreate },
    );
  typia.assert(paymentMethod);

  // 10. Create payment transaction for the order
  const paymentTransactionCreate = {
    orderId: order.id,
    customerId: order.customer_id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: null,
    providerName: paymentMethodCreate.provider_key,
    providerTransactionId: null,
    currency: order.currency_code,
    authorizedAmount: grandTotal,
    capturedAmount: grandTotal,
    paymentStatus: "payment_captured",
    providerStatus: "captured",
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: false,
    metadataJson: null,
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  const paymentTransaction: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      { body: paymentTransactionCreate },
    );
  typia.assert(paymentTransaction);

  // 11. Create initial refund transaction
  const requestedAmount: number = grandTotal / 2;
  const initialApprovedAmount: number = requestedAmount;

  const refundCreate = {
    shopping_mall_payment_transaction_id: paymentTransaction.id,
    shopping_mall_order_id: order.id,
    refund_number: `RF-${RandomGenerator.alphaNumeric(10)}`,
    refund_status: "refund_pending",
    actor_type: "customer",
    reason_category: "customer_cancellation",
    reason_message: "Customer requested refund before shipment.",
    requested_amount: requestedAmount,
    approved_amount: initialApprovedAmount,
    refunded_amount: null,
    currency: paymentTransaction.currency,
    provider_refund_id: null,
    provider_status: null,
    failure_reason_code: null,
    failure_reason_message: null,
  } satisfies IShoppingMallRefundTransaction.ICreate;

  const initialRefund: IShoppingMallRefundTransaction =
    await api.functional.shoppingMall.refundTransactions.create(connection, {
      body: refundCreate,
    });
  typia.assert(initialRefund);

  // Capture immutable linkage fields for later comparison
  const originalPaymentTransactionId =
    initialRefund.shopping_mall_payment_transaction_id;
  const originalOrderId = initialRefund.shopping_mall_order_id;
  const originalRequestedAmount = initialRefund.requested_amount;
  const originalCurrency = initialRefund.currency;

  // 12. Update refund transaction as platform admin
  const updatedApprovedAmount: number = requestedAmount - 5;

  const refundUpdateBody = {
    refund_status: "refund_completed",
    actor_type: "admin",
    reason_category: "admin_adjustment",
    reason_message: "Adjusted and completed by admin.",
    approved_amount: updatedApprovedAmount,
    refunded_amount: updatedApprovedAmount,
    provider_refund_id: `PR_${RandomGenerator.alphaNumeric(8)}`,
    provider_status: "succeeded",
    failure_reason_code: null,
    failure_reason_message: null,
  } satisfies IShoppingMallRefundTransaction.IUpdate;

  const updatedRefund: IShoppingMallRefundTransaction =
    await api.functional.shoppingMall.platformAdmin.refundTransactions.update(
      connection,
      {
        refundTransactionId: initialRefund.id,
        body: refundUpdateBody,
      },
    );
  typia.assert(updatedRefund);

  // 13. Validate that immutable fields are unchanged
  TestValidator.equals(
    "payment transaction linkage must remain unchanged",
    updatedRefund.shopping_mall_payment_transaction_id,
    originalPaymentTransactionId,
  );
  TestValidator.equals(
    "order linkage must remain unchanged",
    updatedRefund.shopping_mall_order_id,
    originalOrderId,
  );
  TestValidator.equals(
    "requested_amount must remain unchanged",
    updatedRefund.requested_amount,
    originalRequestedAmount,
  );
  TestValidator.equals(
    "currency must remain unchanged",
    updatedRefund.currency,
    originalCurrency,
  );

  // 14. Validate that mutable fields reflect updated values
  TestValidator.equals(
    "refund_status should be updated to refund_completed",
    updatedRefund.refund_status,
    refundUpdateBody.refund_status,
  );
  TestValidator.equals(
    "actor_type should be updated to admin",
    updatedRefund.actor_type,
    refundUpdateBody.actor_type,
  );
  TestValidator.equals(
    "reason_category should be updated",
    updatedRefund.reason_category,
    refundUpdateBody.reason_category,
  );
  TestValidator.equals(
    "reason_message should be updated",
    updatedRefund.reason_message,
    refundUpdateBody.reason_message,
  );
  TestValidator.equals(
    "approved_amount should be updated and not exceed requested_amount",
    updatedRefund.approved_amount,
    refundUpdateBody.approved_amount,
  );
  TestValidator.predicate(
    "approved_amount must not exceed requested_amount",
    (updatedRefund.approved_amount ?? 0) <= updatedRefund.requested_amount,
  );
  TestValidator.equals(
    "refunded_amount should match updated approved_amount",
    updatedRefund.refunded_amount,
    refundUpdateBody.refunded_amount,
  );
  TestValidator.equals(
    "provider_refund_id should be updated",
    updatedRefund.provider_refund_id,
    refundUpdateBody.provider_refund_id,
  );
  TestValidator.equals(
    "provider_status should be updated",
    updatedRefund.provider_status,
    refundUpdateBody.provider_status,
  );
  TestValidator.equals(
    "failure_reason_code should be updated to null",
    updatedRefund.failure_reason_code,
    refundUpdateBody.failure_reason_code,
  );
  TestValidator.equals(
    "failure_reason_message should be updated to null",
    updatedRefund.failure_reason_message,
    refundUpdateBody.failure_reason_message,
  );
}
