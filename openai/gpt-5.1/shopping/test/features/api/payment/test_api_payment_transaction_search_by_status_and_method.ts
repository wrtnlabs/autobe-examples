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

export async function test_api_payment_transaction_search_by_status_and_method(
  connection: api.IConnection,
) {
  // 1. Register and authenticate platform admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register and authenticate customer
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPass123!",
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

  // 3. As platform admin, ensure admin session (login again to be explicit)
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass123!",
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/landing",
    } satisfies IShoppingMallPlatformAdminLogin.IRequest,
  });

  // 4. Create minimal catalog: category tree, brand, product, SKU
  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog Tree",
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

  const brandCreateBody = {
    name: `Brand-${RandomGenerator.alphaNumeric(6)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // For seller id, we don't have seller creation API in scope, so we use a random UUID
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productCode = `prod-${RandomGenerator.alphaNumeric(8)}`;
  const productCreateBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product-${RandomGenerator.alphaNumeric(6)}`,
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
        body: productCreateBody,
      },
    );
  typia.assert(product);

  const skuCode = `sku-${RandomGenerator.alphaNumeric(8)}`;
  const skuCreateBody = {
    code: skuCode,
    name: `SKU-${RandomGenerator.alphaNumeric(6)}`,
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

  // 5. As customer, create cart, add item, create order
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "CustomerPass123!",
      ip: null,
      href: "https://shop.example.com/login",
      referrer: "https://shop.example.com/landing",
      userAgent: "E2E Test Agent",
    } satisfies IShoppingMallCustomerAuth.ILogin,
  });

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

  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "Test cart item",
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

  // Prepare order monetary snapshot consistent with SKU price
  const itemsSubtotal = 90;
  const discountAmount = 0;
  const shippingAmount = 10;
  const taxAmount = 9;
  const grandTotal =
    itemsSubtotal - discountAmount + shippingAmount + taxAmount;

  const shippingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const billingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: "USD",
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountAmount,
    shipping_total_amount: shippingAmount,
    tax_total_amount: taxAmount,
    grand_total_amount: grandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "E2E payment transaction test",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 6. Switch back to platform admin
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass123!",
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/landing",
    } satisfies IShoppingMallPlatformAdminLogin.IRequest,
  });

  // 7. Create multiple payment methods (card, bank, wallet)
  const paymentMethodBodies: IShoppingMallPaymentMethod.ICreate[] = [
    {
      code: `card-${RandomGenerator.alphaNumeric(6)}`,
      display_name: "Credit Card",
      description: "Card payments",
      provider_key: "card-gateway",
      method_type: "card",
      currency_restriction: null,
      min_amount: null,
      max_amount: null,
      priority: 1 as number & tags.Type<"int32">,
      is_active: true,
      starts_at: null,
      ends_at: null,
    },
    {
      code: `bank-${RandomGenerator.alphaNumeric(6)}`,
      display_name: "Bank Transfer",
      description: "Bank transfer payments",
      provider_key: "bank-gateway",
      method_type: "bank_transfer",
      currency_restriction: null,
      min_amount: null,
      max_amount: null,
      priority: 2 as number & tags.Type<"int32">,
      is_active: true,
      starts_at: null,
      ends_at: null,
    },
    {
      code: `wallet-${RandomGenerator.alphaNumeric(6)}`,
      display_name: "Wallet",
      description: "Wallet payments",
      provider_key: "wallet-gateway",
      method_type: "wallet",
      currency_restriction: null,
      min_amount: null,
      max_amount: null,
      priority: 3 as number & tags.Type<"int32">,
      is_active: true,
      starts_at: null,
      ends_at: null,
    },
  ];

  const paymentMethods: IShoppingMallPaymentMethod[] = [];
  for (const body of paymentMethodBodies) {
    const method: IShoppingMallPaymentMethod =
      await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
        connection,
        {
          body,
        },
      );
    typia.assert(method);
    paymentMethods.push(method);
  }

  const methodA: IShoppingMallPaymentMethod = paymentMethods[0];
  const methodB: IShoppingMallPaymentMethod = paymentMethods[1];

  // 8. Create multiple payment transactions
  const successfulStatus = "payment_captured";
  const failedStatus = "payment_failed";

  const txBodies: IShoppingMallPaymentTransaction.ICreate[] = [
    // Two successful captures with methodA for our main order
    {
      orderId: order.id,
      customerId: order.customer_id,
      paymentMethodId: methodA.id,
      paymentIntentKey: `intent-${RandomGenerator.alphaNumeric(8)}`,
      providerName: methodA.code,
      providerTransactionId: `prov-${RandomGenerator.alphaNumeric(10)}`,
      currency: order.currency_code as string &
        tags.MinLength<3> &
        tags.MaxLength<3>,
      authorizedAmount: grandTotal,
      capturedAmount: grandTotal,
      paymentStatus: successfulStatus,
      providerStatus: "captured",
      failureReasonCode: null,
      failureReasonMessage: null,
      requiresManualReview: false,
      metadataJson: null,
    },
    {
      orderId: order.id,
      customerId: order.customer_id,
      paymentMethodId: methodA.id,
      paymentIntentKey: `intent-${RandomGenerator.alphaNumeric(8)}`,
      providerName: methodA.code,
      providerTransactionId: `prov-${RandomGenerator.alphaNumeric(10)}`,
      currency: order.currency_code as string &
        tags.MinLength<3> &
        tags.MaxLength<3>,
      authorizedAmount: grandTotal,
      capturedAmount: grandTotal,
      paymentStatus: successfulStatus,
      providerStatus: "captured",
      failureReasonCode: null,
      failureReasonMessage: null,
      requiresManualReview: false,
      metadataJson: null,
    },
    // One failed transaction with methodB for the same order
    {
      orderId: order.id,
      customerId: order.customer_id,
      paymentMethodId: methodB.id,
      paymentIntentKey: `intent-${RandomGenerator.alphaNumeric(8)}`,
      providerName: methodB.code,
      providerTransactionId: `prov-${RandomGenerator.alphaNumeric(10)}`,
      currency: order.currency_code as string &
        tags.MinLength<3> &
        tags.MaxLength<3>,
      authorizedAmount: grandTotal,
      capturedAmount: null,
      paymentStatus: failedStatus,
      providerStatus: "failed",
      failureReasonCode: "card_declined",
      failureReasonMessage: "Card declined",
      requiresManualReview: false,
      metadataJson: null,
    },
  ];

  const createdTransactions: IShoppingMallPaymentTransaction[] = [];
  for (const body of txBodies) {
    const tx: IShoppingMallPaymentTransaction =
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
        connection,
        {
          body,
        },
      );
    typia.assert(tx);
    createdTransactions.push(tx);
  }

  const successfulIdsForMethodA = createdTransactions
    .filter(
      (tx) =>
        tx.paymentMethodId === methodA.id &&
        tx.paymentStatus === successfulStatus,
    )
    .map((tx) => tx.id);

  const failedIdsOrOtherMethods = createdTransactions
    .filter(
      (tx) =>
        tx.paymentMethodId !== methodA.id ||
        tx.paymentStatus !== successfulStatus,
    )
    .map((tx) => tx.id);

  // 9. Search payment transactions with filters
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 2 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<200>;

  const searchRequest = {
    page,
    limit,
    sortBy: "createdAt",
    sortDirection: "desc",
    statusList: [successfulStatus],
    paymentMethodId: methodA.id,
    currency: undefined,
    minAmount: undefined,
    maxAmount: undefined,
    customerId: undefined,
    orderId: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    providerName: undefined,
    providerTransactionId: undefined,
    paymentIntentKey: undefined,
    providerStatus: undefined,
    failureReasonCode: undefined,
    requiresManualReview: undefined,
  } satisfies IShoppingMallPaymentTransaction.IRequest;

  const pageResult: IPageIShoppingMallPaymentTransaction.ISummary =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(pageResult);

  const pagination = pageResult.pagination;
  const data = pageResult.data;

  // 10. Validate pagination metadata
  TestValidator.predicate(
    "limit should be respected in pagination",
    data.length <= pagination.limit,
  );

  TestValidator.predicate(
    "records should be >= data length",
    pagination.records >= data.length,
  );

  TestValidator.predicate("pages should be >= 0", pagination.pages >= 0);

  TestValidator.predicate(
    "current page index should be within range",
    pagination.current >= 0 &&
      (pagination.pages === 0 || pagination.current < pagination.pages),
  );

  // 11. Validate that all returned items satisfy filters
  for (const item of data) {
    // Status filter
    TestValidator.equals(
      "each item status matches requested paymentStatus",
      item.status,
      successfulStatus,
    );

    // Payment method filter: if summary contains payment_method, its id must match
    if (item.payment_method !== undefined) {
      TestValidator.equals(
        "each item payment method id matches requested paymentMethodId",
        item.payment_method.id,
        methodA.id,
      );
    }

    // Also ensure no failed or other-method transaction ids are present
    TestValidator.predicate(
      "no failed or other-method transaction ids included in data",
      failedIdsOrOtherMethods.indexOf(item.id) === -1,
    );
  }

  // 12. Validate that at least some of the known successful methodA transactions are discoverable
  if (successfulIdsForMethodA.length > 0) {
    const foundAnyKnown = data.some(
      (item) => successfulIdsForMethodA.indexOf(item.id) !== -1,
    );
    TestValidator.predicate(
      "at least one known successful methodA transaction appears in results (subject to pagination)",
      foundAnyKnown || pagination.records >= successfulIdsForMethodA.length,
    );
  }

  // 13. Validate sorting by created_at in desc order within page
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];

    const prevTime = Date.parse(prev.created_at);
    const currTime = Date.parse(curr.created_at);

    TestValidator.predicate(
      "results are sorted by created_at in descending order",
      prevTime >= currTime,
    );
  }
}
