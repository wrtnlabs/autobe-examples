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

export async function test_api_platform_admin_view_payment_capture_after_successful_payment_flow(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and becomes authenticated
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

  // 2. Admin creates catalog and payment configuration
  const categoryTreeBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
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
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(16),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // Seller is not creatable via given APIs; fabricate a UUID for seller id.
  const fakeSellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const productCode = RandomGenerator.alphaNumeric(10);
  const productBody = {
    shopping_mall_seller_id: fakeSellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
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

  const skuCurrency = "USD";
  const skuListPrice = 100;
  const skuSalePrice = 80;
  const skuBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: skuListPrice,
    salePrice: skuSalePrice,
    currency: skuCurrency,
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

  const paymentMethodCode = RandomGenerator.alphaNumeric(10);
  const paymentMethodBody = {
    code: paymentMethodCode,
    display_name: "Credit Card",
    description: RandomGenerator.paragraph({ sentences: 3 }),
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
      { body: paymentMethodBody },
    );
  typia.assert(paymentMethod);

  // 3. Customer joins and logs in
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
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

  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
    userAgent: "jest-e2e",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerLoginAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginAuthorized);

  // 4. Customer creates cart and adds item
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
      {
        body: cartBody,
      },
    );
  typia.assert(cart);

  const quantity: number & tags.Type<"int32"> & tags.Minimum<1> = 1 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const cartItemBody = {
    skuId: sku.id,
    quantity,
    note: RandomGenerator.paragraph({ sentences: 2 }),
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

  // 5. Customer creates order from cart
  const itemsSubtotal = skuSalePrice * quantity;
  const discountTotal = 0;
  const shippingTotal = 0;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const shippingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const billingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

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
    customer_note: "please handle with care",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 6. Switch back to platform admin via login (explicit login)
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const adminLoginAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 7. Create payment transaction for the order
  const paymentTransactionBody = {
    orderId: order.id,
    customerId: order.customer_id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: RandomGenerator.alphaNumeric(16),
    providerName: paymentMethodBody.provider_key,
    providerTransactionId: RandomGenerator.alphaNumeric(20),
    currency: skuCurrency as string & tags.MinLength<3> & tags.MaxLength<3>,
    authorizedAmount: grandTotal,
    capturedAmount: null,
    paymentStatus: "payment_authorized",
    providerStatus: "AUTHORIZED",
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

  // 8. Create authorization under the transaction
  const authorizationBody = {
    amount: grandTotal,
    currency: skuCurrency,
    gateway_code: "test-gateway",
    gateway_authorization_id: RandomGenerator.alphaNumeric(24),
    channel: "web",
    risk_metadata: {},
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

  // 9. Create a successful capture under the transaction
  const captureProviderId = RandomGenerator.alphaNumeric(24);
  const captureProviderStatus = "succeeded";
  const captureStatus = "capture_succeeded";

  const captureBody = {
    shopping_mall_payment_authorization_id: authorization.id,
    provider_capture_id: captureProviderId,
    amount: grandTotal,
    currency: skuCurrency,
    capture_status: captureStatus,
    provider_status: captureProviderStatus,
    failure_reason_code: null,
    failure_reason_message: null,
  } satisfies IShoppingMallPaymentCapture.ICreate;

  const createdCapture: IShoppingMallPaymentCapture =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.create(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: captureBody,
      },
    );
  typia.assert(createdCapture);

  // 10. Retrieve capture by id and validate core fields
  const fetchedCapture: IShoppingMallPaymentCapture =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.at(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        captureId: createdCapture.id,
      },
    );
  typia.assert(fetchedCapture);

  TestValidator.equals(
    "capture id should match path parameter",
    fetchedCapture.id,
    createdCapture.id,
  );

  TestValidator.equals(
    "payment transaction id in summary should match path parameter",
    fetchedCapture.paymentTransaction.id,
    paymentTransaction.id,
  );

  TestValidator.equals(
    "capture amount should match created amount",
    fetchedCapture.amount,
    captureBody.amount,
  );

  TestValidator.equals(
    "capture currency should match created currency",
    fetchedCapture.currency,
    captureBody.currency,
  );

  TestValidator.equals(
    "capture status should indicate success",
    fetchedCapture.status,
    captureStatus,
  );

  TestValidator.equals(
    "provider capture id should match when provided",
    fetchedCapture.providerCaptureId,
    captureProviderId,
  );

  TestValidator.equals(
    "provider status should match when provided",
    fetchedCapture.providerStatus,
    captureProviderStatus,
  );

  // createdAt should be a valid date-time string
  const createdAtDate = new Date(fetchedCapture.createdAt);
  await TestValidator.predicate(
    "createdAt should be a valid date",
    () => !Number.isNaN(createdAtDate.getTime()),
  );

  // 11. Negative case: mismatched transactionId must not leak capture
  const differentTransactionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "getting capture with mismatched transactionId should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.at(
        connection,
        {
          paymentTransactionId: differentTransactionId,
          captureId: createdCapture.id,
        },
      );
    },
  );
}
