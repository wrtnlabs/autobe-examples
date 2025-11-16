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
import type { IShoppingMallPaymentStatusEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentStatusEvent";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_platform_admin_payment_status_event_detail_authorization_enforced(
  connection: api.IConnection,
) {
  // 1. Bootstrap a platform admin and let SDK attach its token to the base connection.
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // For clarity, build a dedicated platformAdmin connection object that
  // will carry whatever headers the SDK has already set on `connection`.
  const adminConnection: api.IConnection = { ...connection };

  // 2-1. Create basic catalog data: category tree, brand, product, SKU.
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;
  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      adminConnection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  const brandBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.example.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(
      adminConnection,
      { body: brandBody },
    );
  typia.assert(brand);

  // Product ICreate requires seller and optional brand IDs; we use random
  // seller id as we don't have seller APIs in this scope.
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: `prd-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1>,
    name: RandomGenerator.name(3) as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      adminConnection,
      { body: productBody },
    );
  typia.assert(product);

  const skuBody = {
    code: `sku-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    listPrice: 10_000,
    salePrice: 9_000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      adminConnection,
      {
        productCode: product.code,
        body: skuBody,
      },
    );
  typia.assert(sku);

  // 2-2. Create a payment method
  const paymentMethodBody = {
    code: `pm-${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Test Card",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    provider_key: "test_provider",
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
      adminConnection,
      { body: paymentMethodBody },
    );
  typia.assert(paymentMethod);

  // 2-3. Create a customer via join on a separate customer connection
  const baseCustomerConnection: api.IConnection = { ...connection };

  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(baseCustomerConnection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerConnection: api.IConnection = { ...baseCustomerConnection };

  // 2-4. Customer creates a cart and adds item
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
      customerConnection,
      { body: cartBody },
    );
  typia.assert(cart);

  const cartItemBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: null,
  } satisfies IShoppingMallCustomerCartItem.ICreate;
  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      customerConnection,
      {
        customerCartId: cart.id,
        body: cartItemBody,
      },
    );
  typia.assert(cartItem);

  // For simplicity in this test, we will synthesize consistent monetary
  // snapshot values that align with the SKU price and quantity.
  const itemsSubtotal = cartItem.quantity * sku.salePrice;
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
    customer_note: "test order for payment status events",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(
      customerConnection,
      { body: orderBody },
    );
  typia.assert(order);

  // 2-5. Create a payment transaction for this order as platform admin
  const paymentTransactionBody = {
    orderId: order.id,
    customerId: order.customer_id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: null,
    providerName: paymentMethod.provider_key ?? "test_provider",
    providerTransactionId: null,
    currency: order.currency_code as string &
      tags.MinLength<3> &
      tags.MaxLength<3>,
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
      adminConnection,
      { body: paymentTransactionBody },
    );
  typia.assert(paymentTransaction);

  // 2-6. Create a payment status event under that transaction
  const statusEventBody = {
    previous_status: paymentTransaction.paymentStatus,
    new_status: "payment_captured",
    event_type: "manual_update",
    provider_event_code: null,
    provider_reference: null,
    notes: "Captured by admin for test",
  } satisfies IShoppingMallPaymentStatusEvent.ICreate;
  const createdStatusEvent: IShoppingMallPaymentStatusEvent =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.statusEvents.create(
      adminConnection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: statusEventBody,
      },
    );
  typia.assert(createdStatusEvent);

  // 3. Positive control: admin can fetch the detail
  const adminFetched: IShoppingMallPaymentStatusEvent =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.statusEvents.at(
      adminConnection,
      {
        paymentTransactionId: paymentTransaction.id,
        statusEventId: createdStatusEvent.id,
      },
    );
  typia.assert(adminFetched);

  TestValidator.equals(
    "admin sees the same status event id",
    adminFetched.id,
    createdStatusEvent.id,
  );
  TestValidator.equals(
    "admin sees status event bound to same payment transaction id",
    adminFetched.payment_transaction_id,
    paymentTransaction.id,
  );
  TestValidator.equals(
    "admin sees paymentTransaction summary bound to same payment transaction id",
    adminFetched.paymentTransaction.id,
    paymentTransaction.id,
  );

  // 4. Unauthenticated connection should not be able to read detail
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated access should fail for payment status event detail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.statusEvents.at(
        unauthenticatedConnection,
        {
          paymentTransactionId: paymentTransaction.id,
          statusEventId: createdStatusEvent.id,
        },
      );
    },
  );

  // 5. Customer-authenticated connection should also be denied
  const isolatedCustomerConn: api.IConnection = { ...connection };

  const isolatedCustomerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const isolatedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(isolatedCustomerConn, {
      body: isolatedCustomerJoinBody,
    });
  typia.assert(isolatedCustomer);

  const customerRoleConnection: api.IConnection = { ...isolatedCustomerConn };

  await TestValidator.error(
    "customer role must not read platform admin payment status event detail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.statusEvents.at(
        customerRoleConnection,
        {
          paymentTransactionId: paymentTransaction.id,
          statusEventId: createdStatusEvent.id,
        },
      );
    },
  );
}
