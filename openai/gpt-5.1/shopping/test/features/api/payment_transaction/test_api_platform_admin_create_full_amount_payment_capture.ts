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

/**
 * Validate that a platform admin can create a successful full-amount capture
 * under an authorized payment transaction created from a real order.
 *
 * Business flow:
 *
 * 1. Join as platform admin and stay authenticated via SDK (Authorization header).
 * 2. Create minimal catalog backbone as admin:
 *
 *    - Category tree
 *    - Brand
 *    - Product (single-seller, single-currency, is_multi_sku=false)
 *    - SKU under the product with concrete price and currency
 * 3. Join as a customer and authenticate, switching SDK connection headers to
 *    customer.
 * 4. Create a customer cart and add one item using the SKU id with quantity=1.
 * 5. Synthesize coherent order monetary snapshot from the cart and SKU pricing:
 *
 *    - Items_subtotal_amount = sku price * quantity
 *    - Discount_total_amount = 0
 *    - Shipping_total_amount = 0 (no shipping details in DTOs, keep simple)
 *    - Tax_total_amount = 0
 *    - Grand_total_amount = subtotal (full amount to be paid)
 *    - Use random UUIDs for shipping_address_id and billing_address_id because DTO
 *         requires them
 * 6. Create the order via customer orders.create with the computed snapshot.
 * 7. Switch back to platform admin via login to perform payment operations.
 * 8. Create a payment method with a fixed code and method_type and active window
 *    so it is usable.
 * 9. Create a payment transaction linked to the order and payment method:
 *
 *    - OrderId = order.id
 *    - CustomerId = order.customer_id
 *    - PaymentMethodId = paymentMethod.id
 *    - Currency = order.currency_code
 *    - AuthorizedAmount = grand_total_amount (we expect a full auth)
 *    - CapturedAmount = null initially
 *    - PaymentStatus = "payment_authorized" or similar authorized/in-progress state
 *    - ProviderName, paymentIntentKey, providerStatus, etc. can be arbitrary strings
 *         but consistent
 * 10. Create a payment authorization for the full amount under that transaction:
 *
 *     - Amount = grand_total_amount
 *     - Currency = same as transaction.currency
 *     - Gateway_code and gateway_authorization_id arbitrary but stable
 *     - Channel fixed (e.g., "web")
 * 11. Create a payment capture with IShoppingMallPaymentCapture.ICreate using full
 *     amount:
 *
 *     - Shopping_mall_payment_authorization_id = authorization.id
 *     - Amount = grand_total_amount (full capture)
 *     - Currency = transaction.currency
 *     - Capture_status = "capture_succeeded" (or another success-like status string)
 *     - Provider_status reflects success state (e.g., "succeeded")
 *     - Provider_capture_id some synthetic id string
 * 12. Validate the capture response:
 *
 *     - Typia.assert on IShoppingMallPaymentCapture
 *     - Capture.paymentTransaction.id matches paymentTransaction.id
 *     - Capture.amount equals grand_total_amount
 *     - Capture.currency equals transaction.currency
 *     - Capture.authorization?.id equals authorization.id
 *     - Capture.status equals capture_status we sent
 *     - Capture.providerStatus equals provider_status we sent (considering DTO
 *           naming)
 * 13. Optionally, rely on transaction summary embedded in
 *     capture.paymentTransaction to check that captured_amount in the summary
 *     equals grand_total_amount, but this is best-effort since summary
 *     semantics are provider-defined.
 *
 * Error conditions like over-capture or currency mismatch are not tested here
 * to avoid type-unsafe or unimplemented flows. Focus on the happy path full
 * capture case only.
 */
export async function test_api_platform_admin_create_full_amount_payment_capture(
  connection: api.IConnection,
) {
  // 1. Join as platform admin (auto-sets Authorization header)
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
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

  // 2. Create category tree, brand, product, and SKU as admin
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: undefined,
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;
  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  const brandBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: undefined,
    logo_uri: undefined,
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // For product we need a seller id; the schema requires shopping_mall_seller_id
  // but we do not have seller flows here. Use a random UUID as placeholder; the
  // backend in real E2E may require a real seller, but for contract test this
  // focuses on type and wiring.
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const productCode = `prod-${RandomGenerator.alphaNumeric(8)}`;
  const productBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
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
      { body: productBody },
    );
  typia.assert(product);

  const skuPrice = 1000;
  const skuCurrency = "USD";
  const skuBody = {
    code: `sku-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: skuPrice,
    salePrice: skuPrice,
    currency: skuCurrency,
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

  // 3. Join and login as customer
  const customerJoinBody = {
    email: `customer+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
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

  // 4. Create customer cart as the authenticated customer
  const cartBody = {
    currency_code: skuCurrency,
    region_code: "US",
    channel: "web",
    metadata: undefined,
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;
  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      { body: cartBody },
    );
  typia.assert(cart);

  // 5. Add SKU item to cart
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

  const itemsSubtotal = skuPrice * cartItem.quantity;
  const discountTotal = 0;
  const shippingTotal = 0;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  // 6. Create order from cart with coherent snapshot
  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  const billingAddressId = typia.random<string & tags.Format<"uuid">>();
  const orderBody = {
    customer_cart_id: cart.id,
    currency_code: skuCurrency,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: undefined,
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  TestValidator.equals(
    "order grand total must equal snapshot",
    order.grand_total_amount,
    grandTotal,
  );

  // 7. Re-login as platform admin to perform payment operations
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const adminReAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminReAuthorized);

  // 8. Create a payment method
  const now = new Date();
  const startsAt = new Date(now.getTime() - 60_000).toISOString();
  const endsAt = new Date(now.getTime() + 86_400_000).toISOString();
  const paymentMethodBody = {
    code: `pm-${RandomGenerator.alphaNumeric(8)}`,
    display_name: "Test Card Method",
    description: "E2E test payment method",
    provider_key: "test-gateway",
    method_type: "card",
    currency_restriction: null,
    min_amount: null,
    max_amount: null,
    priority: 1 as number & tags.Type<"int32">,
    is_active: true,
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      { body: paymentMethodBody },
    );
  typia.assert(paymentMethod);

  // 9. Create payment transaction for the order
  const paymentTransactionBody = {
    orderId: order.id,
    customerId: order.customer_id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: `pi-${RandomGenerator.alphaNumeric(10)}`,
    providerName: "test-gateway",
    providerTransactionId: `pt-${RandomGenerator.alphaNumeric(10)}`,
    currency: order.currency_code as string &
      tags.MinLength<3> &
      tags.MaxLength<3>,
    authorizedAmount: grandTotal,
    capturedAmount: null,
    paymentStatus: "payment_authorized",
    providerStatus: "authorized",
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

  TestValidator.equals(
    "transaction order linkage",
    paymentTransaction.orderId,
    order.id,
  );

  // 10. Create full-amount authorization under the transaction
  const authorizationBody = {
    amount: grandTotal,
    currency: paymentTransaction.currency,
    gateway_code: "test-gateway",
    gateway_authorization_id: `auth-${RandomGenerator.alphaNumeric(10)}`,
    channel: "web",
    risk_metadata: undefined,
  } satisfies IShoppingMallPaymentAuthorization.ICreate;
  const authorization: IShoppingMallPaymentAuthorization =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.authorizations.create(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: authorizationBody,
      },
    );
  typia.assert(authorization);

  TestValidator.equals(
    "authorization amount matches grand total",
    authorization.amount,
    grandTotal,
  );

  // 11. Create full-amount capture
  const captureStatus = "capture_succeeded";
  const providerCaptureStatus = "succeeded";
  const providerCaptureId = `cap-${RandomGenerator.alphaNumeric(10)}`;

  const captureBody = {
    shopping_mall_payment_authorization_id: authorization.id,
    provider_capture_id: providerCaptureId,
    amount: grandTotal,
    currency: paymentTransaction.currency,
    capture_status: captureStatus,
    provider_status: providerCaptureStatus,
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

  // 12. Validate capture linkage and monetary correctness
  TestValidator.equals(
    "capture linked to correct transaction",
    capture.paymentTransaction.id,
    paymentTransaction.id,
  );
  TestValidator.equals("capture full amount", capture.amount, grandTotal);
  TestValidator.equals(
    "capture currency matches transaction",
    capture.currency,
    paymentTransaction.currency,
  );
  if (capture.authorization !== undefined && capture.authorization !== null) {
    TestValidator.equals(
      "capture authorization linkage",
      capture.authorization.id,
      authorization.id,
    );
  }
  TestValidator.equals(
    "capture status persisted",
    capture.status,
    captureStatus,
  );
  TestValidator.equals(
    "capture provider status persisted",
    capture.providerStatus,
    providerCaptureStatus,
  );
}
