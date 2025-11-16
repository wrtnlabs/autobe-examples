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

export async function test_api_platform_admin_view_chargeback_authorization_enforced(
  connection: api.IConnection,
) {
  /**
   * Validate that only platformAdmin actors can read a specific payment
   * chargeback.
   *
   * Business flow implemented in this test:
   *
   * 1. Create and authenticate a platform admin (platformAdmin.join).
   * 2. As platform admin, create a payment method configuration used later by a
   *    transaction.
   * 3. Create and authenticate a customer (customer.join).
   * 4. Create and authenticate a seller (seller.join).
   * 5. As seller, create a product and a SKU, and create inventory for that SKU so
   *    it is purchasable.
   * 6. As customer, create a customer cart, add the seller SKU as a cart item, and
   *    then create an order from that cart.
   * 7. As platform admin, create a payment transaction referencing the order and
   *    payment method.
   * 8. As platform admin, create a payment chargeback referencing the payment
   *    transaction and order, capturing chargebackId.
   * 9. Attempt to GET the chargeback without any Authorization header
   *    (unauthenticated) and expect an HTTP error.
   * 10. Attempt to GET the same chargeback as an authenticated customer and as an
   *     authenticated seller and expect HTTP errors (forbidden/unauthorized).
   * 11. Finally, GET the chargeback as an authenticated platform admin and assert
   *     success and data integrity.
   * 12. Assert that the chargeback record returned to the admin matches the one
   *     created, proving read-only, RBAC-protected access.
   */

  // Utility to build a base URL used in auth DTOs
  const href: string & tags.Format<"uri"> =
    "https://example.com/auth" as string & tags.Format<"uri">;
  const referrer: string & tags.Format<"uri"> =
    "https://example.com/" as string & tags.Format<"uri">;

  // 1. Register and authenticate platform admin via join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Platform admin token is already set on connection by SDK.

  // 2. Create a payment method configuration as platform admin
  const paymentMethodBody = {
    code: `card_${RandomGenerator.alphaNumeric(8)}`,
    display_name: "Test Credit Card",
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

  // 3. Create and authenticate a customer
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerJoinBody = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 4. Create and authenticate a seller
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 5. As seller, create product, SKU, and inventory so the SKU is purchasable
  const productCode = `prod_${RandomGenerator.alphaNumeric(8)}`;

  const sellerProductBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: undefined,
    code: productCode as string & tags.MinLength<1>,
    name: RandomGenerator.name(2) as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductBody,
    });
  typia.assert(sellerProduct);

  const skuBody = {
    code: `sku_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    listPrice: 10000,
    salePrice: 10000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode,
      body: skuBody,
    });
  typia.assert(sku);

  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventoryItem);

  // 6. Switch to customer identity: login to ensure customer token is active
  const customerLoginBody = {
    email: customerEmail,
    password: customerJoinBody.password,
    ip: null,
    href,
    referrer,
    userAgent: undefined,
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // Create a customer cart
  const cartBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
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

  // Add SKU to customer cart
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

  // Create an order from the cart
  const itemsSubtotal = (cartItem.unitPrice ?? 10000) * cartItem.quantity;
  const discountTotal = 0;
  const shippingTotal = 0;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const orderBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: undefined,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 7. Switch back to platform admin for payment transaction and chargeback
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  const paymentTransactionBody = {
    orderId: order.id,
    customerId: order.customer_id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: `intent_${RandomGenerator.alphaNumeric(8)}`,
    providerName: paymentMethod.provider_key ?? "test-gateway",
    providerTransactionId: `prov_${RandomGenerator.alphaNumeric(10)}`,
    currency: order.currency_code as string &
      tags.MinLength<3> &
      tags.MaxLength<3>,
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
      { body: paymentTransactionBody },
    );
  typia.assert(paymentTransaction);

  // 8. Create a payment chargeback for that transaction
  const chargebackBody = {
    paymentTransactionId: paymentTransaction.id,
    orderId: order.id,
    caseReference: `CB-${RandomGenerator.alphaNumeric(10)}`,
    providerCaseId: `PROV-CB-${RandomGenerator.alphaNumeric(10)}`,
    disputedAmount: paymentTransaction.capturedAmount ?? grandTotal,
    currency: paymentTransaction.currency,
    status: "chargeback_open",
    reasonCode: "fraud_suspected",
    reasonMessage: "Customer reported unauthorized transaction",
    openedAt: new Date().toISOString() as string & tags.Format<"date-time">,
  } satisfies IShoppingMallPaymentChargeback.ICreate;

  const createdChargeback: IShoppingMallPaymentChargeback =
    await api.functional.shoppingMall.platformAdmin.paymentChargebacks.create(
      connection,
      { body: chargebackBody },
    );
  typia.assert(createdChargeback);

  const chargebackId = createdChargeback.id;

  // 9. Attempt to access chargeback with no Authorization header (unauthenticated)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated user cannot read payment chargeback",
    async () => {
      await api.functional.shoppingMall.platformAdmin.paymentChargebacks.at(
        unauthConnection,
        { chargebackId },
      );
    },
  );

  // 10a. Attempt as authenticated customer
  const customerLoginAgainBody = {
    email: customerEmail,
    password: customerJoinBody.password,
    ip: null,
    href,
    referrer,
    userAgent: undefined,
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerAgain: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginAgainBody,
    });
  typia.assert(customerAgain);

  await TestValidator.error(
    "customer cannot read platform admin payment chargeback",
    async () => {
      await api.functional.shoppingMall.platformAdmin.paymentChargebacks.at(
        connection,
        { chargebackId },
      );
    },
  );

  // 10b. Attempt as authenticated seller
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  await TestValidator.error(
    "seller cannot read platform admin payment chargeback",
    async () => {
      await api.functional.shoppingMall.platformAdmin.paymentChargebacks.at(
        connection,
        { chargebackId },
      );
    },
  );

  // 11. Finally, read as platform admin again and verify integrity
  const adminLoginAgainBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminAgain: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginAgainBody,
    });
  typia.assert(adminAgain);

  const fetchedChargeback: IShoppingMallPaymentChargeback =
    await api.functional.shoppingMall.platformAdmin.paymentChargebacks.at(
      connection,
      { chargebackId },
    );
  typia.assert(fetchedChargeback);

  // 12. Validate that fetched chargeback matches the created one on key fields
  TestValidator.equals(
    "chargeback id remains stable across reads",
    fetchedChargeback.id,
    createdChargeback.id,
  );
  TestValidator.equals(
    "chargeback disputed amount remains unchanged",
    fetchedChargeback.disputedAmount,
    createdChargeback.disputedAmount,
  );
  TestValidator.equals(
    "chargeback status remains unchanged after unauthorized attempts",
    fetchedChargeback.status,
    createdChargeback.status,
  );
}
