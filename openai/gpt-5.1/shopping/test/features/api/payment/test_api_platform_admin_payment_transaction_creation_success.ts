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
 * Successful creation of a platform-admin initiated payment transaction.
 *
 * Business flow (multi-actor, platformAdmin + customer):
 *
 * 1. Platform admin joins the platform (POST /auth/platformAdmin/join).
 * 2. Platform admin creates catalog structures:
 *
 *    - Category tree
 *    - Brand
 *    - Product associated with the brand (seller is a synthetic UUID)
 *    - SKU for the product with concrete pricing and currency.
 * 3. Customer joins the platform (POST /auth/customer/join).
 * 4. Customer creates a persistent cart and adds the SKU as a line item.
 * 5. Customer creates an order from the cart with monetary snapshot fields.
 * 6. Platform admin logs in again (actor switching) and configures a payment
 *    method eligible for the order’s currency and amount.
 * 7. Platform admin creates a payment transaction referencing the order and
 *    payment method, with an initial `payment_authorized` status and
 *    authorizedAmount equal to the order’s grand_total_amount.
 *
 * Validations:
 *
 * - All intermediate entities (admin, customer, category tree, brand, product,
 *   SKU, cart, item, order, payment method, payment transaction) conform to
 *   their DTOs via typia.assert().
 * - The created payment transaction has:
 *
 *   - OrderId matching the created order.id
 *   - PaymentMethodId matching the created paymentMethod.id
 *   - Currency equal to the order.currency_code
 *   - PaymentStatus equal to the requested paymentStatus ("payment_authorized")
 *   - AuthorizedAmount equal to the order.grand_total_amount
 *   - CapturedAmount null on initial authorize-only creation
 *   - RefundedAmount equal to 0
 *   - RequiresManualReview false when explicitly requested
 *   - MetadataJson echoing the payload string
 */
export async function test_api_platform_admin_payment_transaction_creation_success(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (auto-sets Authorization header via SDK)
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword = "Admin!12345";

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Catalog setup as platform admin
  // 2-1. Category tree
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Default Catalog Tree",
    description: "Main category tree for tests",
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  // 2-2. Brand
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(10)}`,
    description: "Test brand for payment transaction workflow",
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 2-3. Product (seller id is a synthetic UUID as seller creation API is not provided)
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: `prod-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1>,
    name: `Test Product ${RandomGenerator.name(1)}` as string &
      tags.MinLength<1>,
    short_description: "Short description for test product",
    description: "Full description for test product in payment transaction E2E",
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productBody },
    );
  typia.assert(product);

  // 2-4. SKU for the product
  const skuCurrency = "USD";
  const listPrice = 500;
  const salePrice = 450;

  const skuBody = {
    code: `sku-${RandomGenerator.alphaNumeric(8)}`,
    name: "Test SKU Variant",
    listPrice,
    salePrice,
    currency: skuCurrency,
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      { productCode: product.code, body: skuBody },
    );
  typia.assert(sku);

  // 3. Customer joins (auto-sets Authorization header for customer)
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword = "Customer!12345";

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
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

  // 4. Customer cart creation
  const cartBody = {
    currency_code: skuCurrency,
    region_code: "US",
    channel: "web",
    metadata: {
      campaign: "spring-sale",
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

  // 5. Add SKU line item to the cart
  const cartItemBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "Primary line item for payment transaction test",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      { customerCartId: cart.id, body: cartItemBody },
    );
  typia.assert(cartItem);

  // 6. Create order from the cart
  // Use the cart’s monetary snapshot for consistency
  const shippingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const billingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: cart.subtotal_amount,
    discount_total_amount: cart.discount_amount,
    shipping_total_amount: cart.shipping_amount,
    tax_total_amount: cart.tax_amount,
    grand_total_amount: cart.total_amount,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "Please deliver between 9am-6pm",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 7. Switch back to platform admin by logging in again
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 8. Create a payment method usable for this order
  const paymentMethodCode = `pm-${RandomGenerator.alphaNumeric(8)}`;
  const paymentMethodBody = {
    code: paymentMethodCode,
    display_name: "Test Credit Card",
    description: "Credit card method for integration testing",
    provider_key: "test-card-gateway",
    method_type: "card",
    currency_restriction: skuCurrency,
    min_amount: order.grand_total_amount * 0.5,
    max_amount: order.grand_total_amount * 2,
    priority: 1 as number & tags.Type<"int32">,
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

  // 9. Create a payment transaction for the order using the payment method
  const paymentIntentKey = `intent-${RandomGenerator.alphaNumeric(16)}`;
  const providerTransactionId = `TXN-${RandomGenerator.alphaNumeric(12)}`;

  const paymentCurrency: string & tags.MinLength<3> & tags.MaxLength<3> =
    order.currency_code as string & tags.MinLength<3> & tags.MaxLength<3>;

  const paymentTransactionCreateBody = {
    orderId: order.id,
    customerId: order.customer_id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey,
    providerName: "test_provider",
    providerTransactionId,
    currency: paymentCurrency,
    authorizedAmount: order.grand_total_amount,
    capturedAmount: null,
    paymentStatus: "payment_authorized",
    providerStatus: "authorized",
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: false,
    metadataJson: JSON.stringify({
      orderCode: order.order_code,
      paymentMethodCode: paymentMethod.code,
    }),
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  const paymentTransaction: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      { body: paymentTransactionCreateBody },
    );
  typia.assert(paymentTransaction);

  // 10. Business assertions on the payment transaction
  TestValidator.equals(
    "payment transaction orderId matches order.id",
    paymentTransaction.orderId,
    order.id,
  );

  TestValidator.equals(
    "payment transaction paymentMethodId matches paymentMethod.id",
    paymentTransaction.paymentMethodId,
    paymentMethod.id,
  );

  TestValidator.equals(
    "payment transaction currency matches order currency",
    paymentTransaction.currency,
    paymentTransactionCreateBody.currency,
  );

  TestValidator.equals(
    "payment transaction paymentStatus matches requested status",
    paymentTransaction.paymentStatus,
    paymentTransactionCreateBody.paymentStatus,
  );

  TestValidator.equals(
    "payment transaction authorizedAmount equals order grand total",
    paymentTransaction.authorizedAmount,
    paymentTransactionCreateBody.authorizedAmount,
  );

  TestValidator.equals(
    "payment transaction capturedAmount is null on initial authorization",
    paymentTransaction.capturedAmount,
    paymentTransactionCreateBody.capturedAmount,
  );

  TestValidator.equals(
    "payment transaction refundedAmount is zero on creation",
    paymentTransaction.refundedAmount,
    0,
  );

  TestValidator.equals(
    "payment transaction requiresManualReview is false",
    paymentTransaction.requiresManualReview,
    false,
  );

  TestValidator.equals(
    "payment transaction metadataJson matches payload",
    paymentTransaction.metadataJson,
    paymentTransactionCreateBody.metadataJson,
  );
}
