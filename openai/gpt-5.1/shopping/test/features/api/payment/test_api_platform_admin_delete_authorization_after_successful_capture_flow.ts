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

export async function test_api_platform_admin_delete_authorization_after_successful_capture_flow(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin (join)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

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

  // 2. Create minimal catalog setup as platform admin
  // 2-1. Category tree (not directly used later but simulates realistic setup)
  const categoryTreeBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 2-2. Brand
  const brandBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 2-3. Product (associate with a random seller and the created brand)
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productCode = RandomGenerator.alphaNumeric(10);
  const productBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
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

  // 2-4. SKU for the product
  const skuBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
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
        productCode,
        body: skuBody,
      },
    );
  typia.assert(sku);

  // 3. Register and authenticate a customer
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);

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

  // 4. Customer creates cart, adds item, and creates order
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
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "test item",
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

  const orderBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: cart.subtotal_amount,
    discount_total_amount: cart.discount_amount,
    shipping_total_amount: cart.shipping_amount,
    tax_total_amount: cart.tax_amount,
    grand_total_amount: cart.total_amount,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "please deliver quickly",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  TestValidator.predicate(
    "order should be linked to the same customer as cart",
    order.customer.id === cart.customer.id,
  );

  // 5. Switch back to platform admin via login to ensure admin context
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminReAuth: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminReAuth);

  // 5-1. Create a payment method
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const startsAt = new Date(now.getTime() - oneDayMs).toISOString();
  const endsAt = new Date(now.getTime() + oneDayMs * 30).toISOString();

  const paymentMethodBody = {
    code: RandomGenerator.alphaNumeric(8),
    display_name: "Test Card",
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
      {
        body: paymentMethodBody,
      },
    );
  typia.assert(paymentMethod);

  // 5-2. Create a payment transaction tied to the order and customer
  const paymentTransactionBody = {
    orderId: order.id,
    customerId: order.customer_id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: RandomGenerator.alphaNumeric(16),
    providerName: "test-gateway",
    providerTransactionId: RandomGenerator.alphaNumeric(12),
    currency: order.currency_code,
    authorizedAmount: order.grand_total_amount,
    capturedAmount: 0,
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
      {
        body: paymentTransactionBody,
      },
    );
  typia.assert(paymentTransaction);

  TestValidator.predicate(
    "payment transaction should reference order correctly",
    paymentTransaction.orderId === order.id,
  );
  TestValidator.predicate(
    "payment transaction should reference payment method correctly",
    paymentTransaction.paymentMethodId === paymentMethod.id,
  );

  // 6. Create a payment authorization under this transaction
  const paymentAuthorizationBody = {
    amount: order.grand_total_amount,
    currency: order.currency_code,
    gateway_code: paymentMethodBody.provider_key,
    gateway_authorization_id: RandomGenerator.alphaNumeric(20),
    channel: "web",
    risk_metadata: {},
  } satisfies IShoppingMallPaymentAuthorization.ICreate;

  const authorization: IShoppingMallPaymentAuthorization =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.authorizations.create(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: paymentAuthorizationBody,
      },
    );
  typia.assert(authorization);

  TestValidator.predicate(
    "authorization should be linked to the same payment transaction",
    authorization.paymentTransaction.id === paymentTransaction.id,
  );

  // 7. Delete the authorization as platform admin
  await api.functional.shoppingMall.platformAdmin.paymentTransactions.authorizations.erase(
    connection,
    {
      paymentTransactionId: paymentTransaction.id,
      authorizationId: authorization.id,
    },
  );

  // 8. Ensure that deleting the same authorization twice fails
  await TestValidator.error(
    "deleting the same authorization twice should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.authorizations.erase(
        connection,
        {
          paymentTransactionId: paymentTransaction.id,
          authorizationId: authorization.id,
        },
      );
    },
  );
}
