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
import type { IShoppingMallPaymentAuthorizationRiskMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAuthorizationRiskMetadata";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_platform_admin_updates_payment_authorization_status_and_metadata(
  connection: api.IConnection,
) {
  // 1. Register and login as platform admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: "AdminPassword!123",
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create supporting catalog: category tree
  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeCreateBody,
      },
    );
  typia.assert(categoryTree);

  // 2-2. Create brand
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 2-3. Create product; seller is taken from a random summary DTO
  const randomSellerSummary: IShoppingMallSeller.ISummary =
    typia.random<IShoppingMallSeller.ISummary>();

  const productCode: string = `prd-${RandomGenerator.alphaNumeric(10)}`;
  const productCreateBody = {
    shopping_mall_seller_id: randomSellerSummary.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product-main.png",
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert(product);

  // 2-4. Create SKU under that product
  const skuCode: string = `sku-${RandomGenerator.alphaNumeric(8)}`;
  const skuCreateBody = {
    code: skuCode,
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
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // 3. Register and login as customer
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPassword!123",
    name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://shop.example.com/signup",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 4. Customer creates cart
  const cartCreateBody = {
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
        body: cartCreateBody,
      },
    );
  typia.assert(cart);

  // 4-2. Add SKU to cart as an item
  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "E2E test cart item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);

  // 4-3. Create order from the cart
  const itemsSubtotal = cartItem.lineSubtotal ?? 90;
  const orderGrandTotal = itemsSubtotal;

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: 0,
    shipping_total_amount: 0,
    tax_total_amount: 0,
    grand_total_amount: orderGrandTotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "E2E order for authorization update test",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 5. Switch back to platform admin: login again to ensure admin context
  const adminLoginBody = {
    email: adminEmail,
    password: "AdminPassword!123",
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminAuthorizedAgain: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedAgain);

  // 5-1. Create payment method
  const paymentMethodCode = `pm-${RandomGenerator.alphaNumeric(8)}`;
  const startsAtIso = new Date().toISOString();

  const paymentMethodCreateBody = {
    code: paymentMethodCode,
    display_name: "Test Credit Card",
    description: "E2E test payment method",
    provider_key: "test-gateway",
    method_type: "card",
    currency_restriction: "USD",
    min_amount: 0,
    max_amount: 100000,
    priority: 1 as number & tags.Type<"int32">,
    is_active: true,
    starts_at: startsAtIso,
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

  // 6. Create payment transaction for the order
  const transactionCurrency = order.currency_code;
  const initialAuthorizedAmount = order.grand_total_amount;

  const paymentTxCreateBody = {
    orderId: order.id,
    customerId: order.customer_id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: `pi-${RandomGenerator.alphaNumeric(12)}`,
    providerName: "test-gateway",
    providerTransactionId: `txn-${RandomGenerator.alphaNumeric(12)}`,
    currency: transactionCurrency,
    authorizedAmount: initialAuthorizedAmount,
    capturedAmount: null,
    paymentStatus: "payment_authorized",
    providerStatus: "AUTHORIZED",
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: false,
    metadataJson: JSON.stringify({ source: "e2e" }),
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  const paymentTx: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      { body: paymentTxCreateBody },
    );
  typia.assert(paymentTx);

  // 7. Create initial payment authorization for that transaction
  const riskMetadataInitial: IShoppingMallPaymentAuthorizationRiskMetadata = {
    riskScore: 20,
    rule: "low_risk",
  };

  const authCreateBody = {
    amount: initialAuthorizedAmount,
    currency: transactionCurrency,
    gateway_code: "test-gateway",
    gateway_authorization_id: `auth-${RandomGenerator.alphaNumeric(10)}`,
    channel: "web_checkout",
    risk_metadata: riskMetadataInitial,
  } satisfies IShoppingMallPaymentAuthorization.ICreate;

  const initialAuth: IShoppingMallPaymentAuthorization =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.authorizations.create(
      connection,
      {
        paymentTransactionId: paymentTx.id,
        body: authCreateBody,
      },
    );
  typia.assert(initialAuth);

  // 8. Update authorization with new status and risk metadata
  const updatedRiskMetadata: IShoppingMallPaymentAuthorizationRiskMetadata = {
    riskScore: 5,
    rule: "manual_review_passed",
  };

  const updateBody = {
    authorization_status: "authorized_final",
    gateway_status_code: "200",
    gateway_status_message: "Authorization confirmed",
    risk_metadata: updatedRiskMetadata,
  } satisfies IShoppingMallPaymentAuthorization.IUpdate;

  const updatedAuth: IShoppingMallPaymentAuthorization =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.authorizations.update(
      connection,
      {
        paymentTransactionId: paymentTx.id,
        authorizationId: initialAuth.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAuth);

  // 9. Validate fields: immutables unchanged, mutables updated
  TestValidator.equals(
    "authorization id remains unchanged",
    updatedAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "payment transaction linkage remains unchanged",
    updatedAuth.paymentTransaction.id,
    initialAuth.paymentTransaction.id,
  );
  TestValidator.equals(
    "amount remains unchanged",
    updatedAuth.amount,
    initialAuth.amount,
  );
  TestValidator.equals(
    "currency remains unchanged",
    updatedAuth.currency,
    initialAuth.currency,
  );

  TestValidator.equals(
    "authorization_status updated",
    updatedAuth.authorization_status,
    updateBody.authorization_status,
  );

  // 10. Negative path: unauthenticated/non-admin cannot update authorization
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated client cannot update payment authorization",
    async () => {
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.authorizations.update(
        unauthenticatedConnection,
        {
          paymentTransactionId: paymentTx.id,
          authorizationId: initialAuth.id,
          body: updateBody,
        },
      );
    },
  );
}
