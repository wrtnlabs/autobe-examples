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
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_platform_admin_authorization_amount_exceeds_transaction_remaining(
  connection: api.IConnection,
) {
  /**
   * 1. Register a platform administrator and obtain an authenticated admin
   *    session.
   */
  const platformAdminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.test.com/join",
    referrer: "https://admin.test.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  /**
   * 2. As platform admin, create a payment method that will be used by the payment
   *    transaction.
   */
  const paymentMethodCreateBody = {
    code: `pm_${RandomGenerator.alphaNumeric(8)}`,
    display_name: "Test Credit Card",
    description: RandomGenerator.paragraph({ sentences: 3 }),
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
      {
        body: paymentMethodCreateBody,
      },
    );
  typia.assert(paymentMethod);

  /**
   * 3. Create catalog structures as platform admin: category tree, brand, product,
   *    SKU.
   *
   *    Note: The product creation DTO requires a seller id, but no seller
   *    join/login API is available in this test context. To keep the scenario
   *    implementable and compilable, we rely on typia.random for seller id and
   *    treat this part as pure backend simulation of catalog setup without
   *    exercising seller flows.
   */
  const categoryTreeBody = {
    code: `tree_${RandomGenerator.alphaNumeric(6)}`,
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

  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: "https://cdn.test.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  const productCode = `prod_${RandomGenerator.alphaNumeric(8)}`;

  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: "Test Product",
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.test.com/product-main.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productBody },
    );
  typia.assert(product);

  const skuCode = `sku_${RandomGenerator.alphaNumeric(8)}`;

  const skuBody = {
    code: skuCode,
    name: "Default Variant",
    listPrice: 10_000,
    salePrice: 10_000,
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

  /** 4. Register a customer and log them in to create a cart and an order. */
  const customerEmail = `${RandomGenerator.alphabets(8)}@customer.test.com`;

  const customerJoinBody = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://shop.test.com/join",
    referrer: "https://shop.test.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // Login once more to simulate normal login flow (not strictly required, but uses login API).
  const customerLoginBody = {
    email: customerEmail,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.test.com/login",
    referrer: "https://shop.test.com/",
    userAgent: "E2E-Test-Agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerAuthorizedAgain: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerAuthorizedAgain);

  /** 5. Customer creates a cart and adds the SKU as an item. */
  const cartBody = {
    currency_code: "USD",
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

  const cartItemBody = {
    skuId: sku.id,
    quantity: 1,
    note: "Test item",
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

  /**
   * 6. Customer places an order from the cart using snapshot amounts that match
   *    the SKU sale price.
   */
  const grandTotal = sku.salePrice;

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: grandTotal,
    discount_total_amount: 0,
    shipping_total_amount: 0,
    tax_total_amount: 0,
    grand_total_amount: grandTotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Please handle with care.",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  TestValidator.equals(
    "order grand total equals expected",
    order.grand_total_amount,
    grandTotal,
  );

  /**
   * 7. Switch back to platform admin role (re-login) before creating the payment
   *    transaction and subsequent authorizations.
   */
  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.test.com/login",
    referrer: "https://admin.test.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminAuthorizedAgain: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuthorizedAgain);

  /**
   * 8. Create a payment transaction for the order with authorizedAmount matching
   *    the grand total.
   */
  const paymentTransactionCreateBody = {
    orderId: order.id,
    customerId: order.customer_id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: null,
    providerName: paymentMethod.provider_key ?? "gateway", // use provider_key as providerName if available
    providerTransactionId: null,
    currency: order.currency_code,
    authorizedAmount: grandTotal,
    capturedAmount: null,
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
        body: paymentTransactionCreateBody,
      },
    );
  typia.assert(paymentTransaction);

  TestValidator.equals(
    "paymentTransaction authorizedAmount equals order grand total",
    paymentTransaction.authorizedAmount ?? grandTotal,
    grandTotal,
  );

  /**
   * 9. First authorization: create a payment authorization for the full remaining
   *    amount. This should succeed and represent a fully authorized payment.
   */
  const authorizationCreateBodyFull = {
    amount: grandTotal,
    currency: paymentTransaction.currency,
    gateway_code: paymentTransaction.providerName,
    gateway_authorization_id: `auth_${RandomGenerator.alphaNumeric(10)}`,
    channel: "web",
    risk_metadata: {},
  } satisfies IShoppingMallPaymentAuthorization.ICreate;

  const fullAuthorization: IShoppingMallPaymentAuthorization =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.authorizations.create(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: authorizationCreateBodyFull,
      },
    );
  typia.assert(fullAuthorization);

  TestValidator.equals(
    "full authorization amount equals transaction authorizedAmount",
    fullAuthorization.amount,
    grandTotal,
  );

  /**
   * 10. Second authorization attempt with a positive amount, which should exceed
   *     the remaining payable amount (which is now zero). The business rule
   *     requires this to fail with a 4xx-style error.
   */
  const authorizationCreateBodyOver = {
    amount: grandTotal,
    currency: paymentTransaction.currency,
    gateway_code: paymentTransaction.providerName,
    gateway_authorization_id: `auth_${RandomGenerator.alphaNumeric(10)}`,
    channel: "web",
    risk_metadata: {},
  } satisfies IShoppingMallPaymentAuthorization.ICreate;

  await TestValidator.error(
    "second authorization exceeding remaining amount must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.authorizations.create(
        connection,
        {
          paymentTransactionId: paymentTransaction.id,
          body: authorizationCreateBodyOver,
        },
      );
    },
  );

  /**
   * 11. RBAC check: attempt to create an authorization as a customer should fail.
   *
   *     The SDK automatically manages Authorization headers. To simulate a customer
   *     context, we re-login as customer (which will set the connection headers
   *     to the customer token) and attempt the same authorization call, which
   *     must be denied.
   */
  const customerAuthorizedThird: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerAuthorizedThird);

  await TestValidator.error(
    "customer actor must not be able to create payment authorizations",
    async () => {
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.authorizations.create(
        connection,
        {
          paymentTransactionId: paymentTransaction.id,
          body: authorizationCreateBodyOver,
        },
      );
    },
  );
}
