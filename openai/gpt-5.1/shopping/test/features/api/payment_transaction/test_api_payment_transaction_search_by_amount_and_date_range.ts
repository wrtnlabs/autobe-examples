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

export async function test_api_payment_transaction_search_by_amount_and_date_range(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a dedicated platform admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: "AdminPassword!234",
    ip: "127.0.0.1",
    href: "https://admin.local/join",
    referrer: "https://admin.local/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a payment method for all transactions
  const now = new Date();
  const startsAt = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const endsAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const paymentMethodBody = {
    code: `pm-${RandomGenerator.alphaNumeric(8)}`,
    display_name: "Test Card Method",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    provider_key: "test-card-provider",
    method_type: "card",
    currency_restriction: "USD",
    min_amount: 10,
    max_amount: 100000,
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

  // 3. Create a customer, cart, SKU, and order to associate with payment transactions
  // 3-1. Create a customer and log in as customer
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPassword!234",
    name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://mall.local/join",
    referrer: "https://mall.local/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 3-2. As admin, create brand and product+SKU to be purchasable
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword!234",
      ip: "127.0.0.1",
      href: "https://admin.local/login",
      referrer: "https://admin.local/landing",
    } satisfies IShoppingMallPlatformAdminLogin.IRequest,
  });

  const brandBody = {
    name: `Brand-${RandomGenerator.alphabets(5)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.local/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // Since we don't have a seller creation API in this scenario, generate a stand-in seller UUID
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productCode = `prd-${RandomGenerator.alphaNumeric(8)}`;
  const productBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product-${RandomGenerator.alphabets(6)}`,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.local/product.png" as string &
      tags.Format<"uri">,
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

  const skuBody = {
    code: `sku-${RandomGenerator.alphaNumeric(6)}`,
    name: "Default SKU",
    listPrice: 200,
    salePrice: 150,
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

  // 3-3. Switch back to customer and create cart, cart item, and order
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "CustomerPassword!234",
      ip: "127.0.0.1",
      href: "https://mall.local/login",
      referrer: "https://mall.local/landing",
    } satisfies IShoppingMallCustomerAuth.ILogin,
  });

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

  const orderTotal = 150;
  const orderBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: orderTotal,
    discount_total_amount: 0,
    shipping_total_amount: 0,
    tax_total_amount: 0,
    grand_total_amount: orderTotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "E2E payment test order",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 4. Switch to platform admin and create multiple payment transactions with different amounts
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword!234",
      ip: "127.0.0.1",
      href: "https://admin.local/login",
      referrer: "https://admin.local/landing",
    } satisfies IShoppingMallPlatformAdminLogin.IRequest,
  });

  const amountGroups = [
    5000, // small
    15000, // medium (target range)
    30000, // large
    18000, // medium (target range)
    8000, // small
  ];

  const createdTransactions: IShoppingMallPaymentTransaction[] = [];

  for (const amount of amountGroups) {
    const txBody = {
      orderId: order.id,
      customerId: order.customer_id,
      paymentMethodId: paymentMethod.id,
      paymentIntentKey: undefined,
      providerName: paymentMethod.provider_key ?? "test-provider",
      providerTransactionId: undefined,
      currency: cart.currency_code as string &
        tags.MinLength<3> &
        tags.MaxLength<3>,
      authorizedAmount: amount,
      capturedAmount: amount,
      paymentStatus: "payment_captured",
      providerStatus: "captured",
      failureReasonCode: null,
      failureReasonMessage: null,
      requiresManualReview: false,
      metadataJson: null,
    } satisfies IShoppingMallPaymentTransaction.ICreate;

    const tx: IShoppingMallPaymentTransaction =
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
        connection,
        {
          body: txBody,
        },
      );
    typia.assert(tx);
    createdTransactions.push(tx);

    // Ensure a small delay in createdAt timestamps ordering via JS time
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  // 5. Determine filter ranges based on created transactions
  const sortedByCreatedAt = [...createdTransactions].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );

  const createdFrom =
    sortedByCreatedAt[1]?.createdAt ?? sortedByCreatedAt[0].createdAt;
  const createdTo =
    sortedByCreatedAt[sortedByCreatedAt.length - 2]?.createdAt ??
    sortedByCreatedAt[sortedByCreatedAt.length - 1].createdAt;

  const minAmount = 10000;
  const maxAmount = 25000;

  const filterBodyPage1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 2 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    sortBy: "createdAt",
    sortDirection: "asc" as const,
    minAmount,
    maxAmount,
    createdFrom,
    createdTo,
  } satisfies IShoppingMallPaymentTransaction.IRequest;

  const page1: IPageIShoppingMallPaymentTransaction.ISummary =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.index(
      connection,
      {
        body: filterBodyPage1,
      },
    );
  typia.assert(page1);

  const { pagination: page1Meta, data: page1Data } = page1;

  // Basic pagination expectations
  TestValidator.predicate(
    "page1 current index should be 0-based for first page",
    page1Meta.current === 0,
  );
  TestValidator.predicate(
    "page1 limit should equal requested limit",
    page1Meta.limit === filterBodyPage1.limit,
  );
  TestValidator.predicate(
    "page1 records should be >= data length",
    page1Meta.records >= page1Data.length,
  );

  // Validate each record on page1 respects range filters and sort order
  for (let i = 0; i < page1Data.length; i++) {
    const tx = page1Data[i];
    const amount = tx.amount;

    TestValidator.predicate(
      `transaction amount within range on page1 index ${i}`,
      amount >= minAmount && amount <= maxAmount,
    );

    TestValidator.predicate(
      `transaction createdAt within date range on page1 index ${i}`,
      tx.created_at >= createdFrom && tx.created_at <= createdTo,
    );

    if (i > 0) {
      TestValidator.predicate(
        `created_at ascending order on page1 index ${i}`,
        page1Data[i - 1].created_at <= tx.created_at,
      );
    }
  }

  // 6. If there are more records than first page, fetch next page and ensure continuity
  if (page1Meta.pages > 1) {
    const filterBodyPage2 = {
      ...filterBodyPage1,
      page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    } satisfies IShoppingMallPaymentTransaction.IRequest;

    const page2: IPageIShoppingMallPaymentTransaction.ISummary =
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.index(
        connection,
        {
          body: filterBodyPage2,
        },
      );
    typia.assert(page2);

    const { pagination: page2Meta, data: page2Data } = page2;

    TestValidator.predicate(
      "page2 current index should be 1 for second page (0-based)",
      page2Meta.current === 1,
    );

    // Ensure no ID duplication across page1 and page2
    const page1Ids = new Set(page1Data.map((tx) => tx.id));
    for (const tx of page2Data) {
      TestValidator.predicate(
        "no duplicated transaction id between page1 and page2",
        !page1Ids.has(tx.id),
      );

      const amount = tx.amount;
      TestValidator.predicate(
        "transaction amount within range on page2",
        amount >= minAmount && amount <= maxAmount,
      );

      TestValidator.predicate(
        "transaction createdAt within date range on page2",
        tx.created_at >= createdFrom && tx.created_at <= createdTo,
      );
    }

    // Check global record count consistency
    TestValidator.predicate(
      "records count should be at least sum of page lengths",
      page2Meta.records >= page1Data.length + page2Data.length,
    );
  }
}
