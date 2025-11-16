import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentTransaction";
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

export async function test_api_payment_transaction_search_by_customer_and_order(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as platform admin (auto-sets Authorization header)
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create catalog basics as platform admin: category tree, brand, product, SKU
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
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
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: `prod-${RandomGenerator.alphaNumeric(8)}`,
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
      { body: productBody },
    );
  typia.assert(product);

  const skuBody = {
    code: `sku-${RandomGenerator.alphaNumeric(8)}`,
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
        body: skuBody,
      },
    );
  typia.assert(sku);

  // Helper to create a customer (join + login) and immediately create its order
  const createCustomerAndOrder = async () => {
    const email = typia.random<string & tags.Format<"email">>();
    const password = RandomGenerator.alphaNumeric(12);

    const joinBody = {
      email,
      password,
      name: RandomGenerator.name(),
      ip: null,
      href: "https://shop.example.com/join",
      referrer: "https://shop.example.com/landing",
    } satisfies IShoppingMallCustomerAuth.IJoin;

    const joined: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.join(connection, {
        body: joinBody,
      });
    typia.assert(joined);

    const loginBody = {
      email,
      password,
      ip: null,
      href: "https://shop.example.com/login",
      referrer: "https://shop.example.com/join",
      userAgent: "E2E-Test-Agent",
    } satisfies IShoppingMallCustomerAuth.ILogin;

    const authorized: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.login(connection, {
        body: loginBody,
      });
    typia.assert(authorized);

    // Now connection is authenticated as this customer; create cart, item, order
    const cartBody = {
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
        { body: cartBody },
      );
    typia.assert(cart);

    const cartItemBody = {
      skuId: sku.id,
      quantity: 1,
      note: "E2E test item",
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

    const unitPrice = cartItem.unitPrice ?? sku.salePrice;
    const itemsSubtotal = unitPrice * cartItem.quantity;
    const discountTotal = 0;
    const shippingTotal = 10;
    const taxTotal = Math.round(itemsSubtotal * 0.1 * 100) / 100;
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
      customer_note: "E2E order",
    } satisfies IShoppingMallOrder.ICreate;

    const order: IShoppingMallOrder =
      await api.functional.shoppingMall.customer.orders.create(connection, {
        body: orderBody,
      });
    typia.assert(order);

    return { customer: authorized, order };
  };

  // 3. Create two distinct customers, each with its own order
  const { customer: customerA, order: orderA1 } =
    await createCustomerAndOrder();
  const { customer: customerB, order: orderB1 } =
    await createCustomerAndOrder();

  // 4. Switch back to platform admin via login
  const adminLoginBody = {
    email: platformAdmin.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/join",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorized);

  // 5. Create a payment method
  const paymentMethodBody = {
    code: `pm-${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Test Card",
    description: "E2E test payment method",
    provider_key: "test-provider",
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

  // 6. Create payment transactions for both orders as platform admin
  const createPaymentTx = async (
    order: IShoppingMallOrder,
    customer: IShoppingMallCustomer.IAuthorized,
    amount: number,
  ): Promise<IShoppingMallPaymentTransaction> => {
    const txBody = {
      orderId: order.id,
      customerId: customer.id,
      paymentMethodId: paymentMethod.id,
      paymentIntentKey: `intent-${RandomGenerator.alphaNumeric(8)}`,
      providerName: "test-gateway",
      providerTransactionId: RandomGenerator.alphaNumeric(16),
      currency: order.currency_code as string &
        tags.MinLength<3> &
        tags.MaxLength<3>,
      authorizedAmount: amount,
      capturedAmount: amount,
      paymentStatus: "payment_captured",
      providerStatus: "succeeded",
      failureReasonCode: null,
      failureReasonMessage: null,
      requiresManualReview: false,
      metadataJson: null,
    } satisfies IShoppingMallPaymentTransaction.ICreate;

    const tx: IShoppingMallPaymentTransaction =
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
        connection,
        { body: txBody },
      );
    typia.assert(tx);
    return tx;
  };

  const txA1_1 = await createPaymentTx(
    orderA1,
    customerA,
    orderA1.grand_total_amount,
  );
  const txB1_1 = await createPaymentTx(
    orderB1,
    customerB,
    orderB1.grand_total_amount,
  );
  void txA1_1;
  void txB1_1;

  // 7. Search payment transactions filtered by specific customerId and orderId
  const searchBodyExact = {
    page: 1,
    limit: 10,
    sortBy: "createdAt",
    sortDirection: "desc" as const,
    statusList: undefined,
    paymentMethodId: paymentMethod.id,
    currency: orderA1.currency_code as string &
      tags.MinLength<3> &
      tags.MaxLength<3>,
    minAmount: undefined,
    maxAmount: undefined,
    customerId: customerA.id,
    orderId: orderA1.id,
    createdFrom: undefined,
    createdTo: undefined,
    providerName: "test-gateway",
    providerTransactionId: undefined,
    paymentIntentKey: undefined,
    providerStatus: undefined,
    failureReasonCode: undefined,
    requiresManualReview: undefined,
  } satisfies IShoppingMallPaymentTransaction.IRequest;

  const pageExact: IPageIShoppingMallPaymentTransaction.ISummary =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.index(
      connection,
      { body: searchBodyExact },
    );
  typia.assert(pageExact);

  const paginationExact = pageExact.pagination;
  TestValidator.equals(
    "pagination current should be zero-based for requested page 1",
    paginationExact.current,
    0,
  );
  TestValidator.equals(
    "pagination limit reflects requested limit",
    paginationExact.limit,
    searchBodyExact.limit,
  );
  TestValidator.predicate(
    "records should be at least the number of returned items",
    paginationExact.records >= pageExact.data.length,
  );

  TestValidator.predicate(
    "at least one transaction for customer+order filter",
    pageExact.data.length >= 1,
  );

  for (const summary of pageExact.data) {
    TestValidator.equals(
      "summary order_id equals filtered orderId",
      summary.order_id,
      orderA1.id,
    );
    TestValidator.equals(
      "summary currency matches order currency",
      summary.currency,
      orderA1.currency_code,
    );
  }

  const hasB1 = pageExact.data.some((s) => s.order_id === orderB1.id);
  TestValidator.predicate(
    "no transactions from other orders should be included",
    hasB1 === false,
  );

  // 8. Search filtered only by customerId (without orderId)
  const searchBodyByCustomer = {
    page: 1,
    limit: 10,
    sortBy: "createdAt",
    sortDirection: "desc" as const,
    statusList: undefined,
    paymentMethodId: paymentMethod.id,
    currency: orderA1.currency_code as string &
      tags.MinLength<3> &
      tags.MaxLength<3>,
    minAmount: undefined,
    maxAmount: undefined,
    customerId: customerA.id,
    orderId: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    providerName: "test-gateway",
    providerTransactionId: undefined,
    paymentIntentKey: undefined,
    providerStatus: undefined,
    failureReasonCode: undefined,
    requiresManualReview: undefined,
  } satisfies IShoppingMallPaymentTransaction.IRequest;

  const pageCustomer: IPageIShoppingMallPaymentTransaction.ISummary =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.index(
      connection,
      { body: searchBodyByCustomer },
    );
  typia.assert(pageCustomer);

  const hasA1 = pageCustomer.data.some((s) => s.order_id === orderA1.id);
  TestValidator.predicate(
    "transactions for customerA should be present when filtering by customerId",
    hasA1 === true,
  );

  const hasOtherCustomer = pageCustomer.data.some(
    (s) => s.order_id === orderB1.id,
  );
  TestValidator.predicate(
    "transactions for other customer should not be returned when filtering by customerId",
    hasOtherCustomer === false,
  );
}
