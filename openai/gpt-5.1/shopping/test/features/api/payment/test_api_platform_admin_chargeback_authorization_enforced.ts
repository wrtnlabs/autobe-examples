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
import type { IShoppingMallPaymentChargeback } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentChargeback";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_platform_admin_chargeback_authorization_enforced(
  connection: api.IConnection,
) {
  // 1. Bootstrap actors: platformAdmin, customer, seller
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword: string = RandomGenerator.alphaNumeric(12);

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword: string = RandomGenerator.alphaNumeric(12);

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/signup",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string = RandomGenerator.alphaNumeric(12);

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 2. PlatformAdmin catalog and payment setup
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

  const categoryTreeBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: "Main Catalog",
    description: RandomGenerator.paragraph({ sentences: 3 }),
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
    name: RandomGenerator.name(1),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // Create a product as platformAdmin (backed by a specific seller id)
  const productCode: string & tags.MinLength<1> = RandomGenerator.alphaNumeric(
    12,
  ) as string & tags.MinLength<1>;

  const productBody = {
    shopping_mall_seller_id: seller.seller.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(2),
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
      {
        body: productBody,
      },
    );
  typia.assert(product);

  // Create SKU under that product (platformAdmin scope)
  const skuBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: `${product.name} Variant`,
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

  // 2.3 Create a payment method configuration
  const paymentMethodBody = {
    code: `pm_${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Test Card",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    provider_key: "provider-test",
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

  // 3. Customer cart and order flow
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
    userAgent: "E2E-Test-Agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

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
      {
        body: cartBody,
      },
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

  const orderAmount = 100;

  const orderBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: orderAmount,
    discount_total_amount: 0,
    shipping_total_amount: 0,
    tax_total_amount: 0,
    grand_total_amount: orderAmount,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Test order",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 4. Payment transaction creation as platformAdmin
  const platformAdminLoggedInAgain: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedInAgain);

  const paymentTransactionBody = {
    orderId: order.id,
    customerId: customerLoggedIn.id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: undefined,
    providerName: "test-gateway",
    providerTransactionId: undefined,
    currency: order.currency_code as string &
      tags.MinLength<3> &
      tags.MaxLength<3>,
    authorizedAmount: order.grand_total_amount,
    capturedAmount: order.grand_total_amount,
    paymentStatus: "payment_captured",
    providerStatus: undefined,
    failureReasonCode: undefined,
    failureReasonMessage: undefined,
    requiresManualReview: false,
    metadataJson: undefined,
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  const paymentTransaction: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      { body: paymentTransactionBody },
    );
  typia.assert(paymentTransaction);

  // Prepare a valid base chargeback payload
  const disputedAmount =
    paymentTransaction.capturedAmount ?? order.grand_total_amount;
  const chargebackBase = {
    paymentTransactionId: paymentTransaction.id,
    orderId: paymentTransaction.orderId,
    caseReference: `CB-${RandomGenerator.alphaNumeric(8)}`,
    providerCaseId: "PROV-CASE-001",
    disputedAmount,
    currency: paymentTransaction.currency,
    status: "chargeback_open",
    reasonCode: "TEST_REASON",
    reasonMessage: "E2E authorization test chargeback",
    openedAt: new Date().toISOString(),
  } satisfies IShoppingMallPaymentChargeback.ICreate;

  // 5. Unauthorized attempt as unauthenticated client
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated client cannot create chargeback",
    async () => {
      await api.functional.shoppingMall.platformAdmin.paymentChargebacks.create(
        unauthenticatedConnection,
        { body: chargebackBase },
      );
    },
  );

  // 6. Unauthorized attempts as customer and seller
  const customerLoggedInAgain: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedInAgain);

  await TestValidator.error(
    "customer actor cannot create chargeback",
    async () => {
      await api.functional.shoppingMall.platformAdmin.paymentChargebacks.create(
        connection,
        { body: chargebackBase },
      );
    },
  );

  const sellerLoggedInAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        ip: null,
        href: "https://seller.example.com/login",
        referrer: "https://seller.example.com/",
      } satisfies IShoppingMallSellerLogin.IRequest,
    });
  typia.assert(sellerLoggedInAgain);

  await TestValidator.error(
    "seller actor cannot create chargeback",
    async () => {
      await api.functional.shoppingMall.platformAdmin.paymentChargebacks.create(
        connection,
        { body: chargebackBase },
      );
    },
  );

  // 7. Authorized chargeback creation as platformAdmin
  const platformAdminLoggedInFinal: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedInFinal);

  const chargeback: IShoppingMallPaymentChargeback =
    await api.functional.shoppingMall.platformAdmin.paymentChargebacks.create(
      connection,
      { body: chargebackBase },
    );
  typia.assert(chargeback);

  TestValidator.equals(
    "chargeback is linked to correct payment transaction",
    chargeback.paymentTransactionId,
    paymentTransaction.id,
  );
  TestValidator.equals(
    "chargeback is linked to correct order",
    chargeback.orderId,
    paymentTransaction.orderId,
  );
  TestValidator.equals(
    "disputedAmount is persisted correctly",
    chargeback.disputedAmount,
    disputedAmount,
  );
  TestValidator.equals(
    "currency is persisted correctly",
    chargeback.currency,
    paymentTransaction.currency,
  );
  TestValidator.equals(
    "status is persisted correctly",
    chargeback.status,
    chargebackBase.status,
  );
  TestValidator.equals(
    "reasonCode is persisted correctly",
    chargeback.reasonCode,
    chargebackBase.reasonCode,
  );
}
