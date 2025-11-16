import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
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

export async function test_api_customer_order_search_with_filters_and_ranges(
  connection: api.IConnection,
) {
  // 1. Platform admin, seller, and customer authentication setup
  // Platform admin join & login
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // Seller join & login
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SellerPass123!",
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // Customer join & login
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
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

  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/landing",
    userAgent: "E2E-Test-Agent/1.0",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 2. As platformAdmin, create category tree and brand
  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog Tree",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;
  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeCreateBody },
    );
  typia.assert(categoryTree);

  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. As seller, create two products and their SKUs, plus inventory
  // Switch to seller context is already managed by auth.seller.login
  const productCode1 = `prod-${RandomGenerator.alphaNumeric(8)}`;
  const productCode2 = `prod-${RandomGenerator.alphaNumeric(8)}`;

  const productCreateBase = (code: string, attachBrand: boolean) =>
    ({
      shopping_mall_seller_id: sellerAuthorized.id,
      shopping_mall_brand_id: attachBrand ? brand.id : null,
      code,
      name: `Product ${code}`,
      short_description: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.content({ paragraphs: 2 }),
      status: "active",
      is_multi_sku: true,
      primary_image_uri: "https://cdn.example.com/product.png",
      additional_data: null,
    }) satisfies IShoppingMallProduct.ICreate;

  const product1: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBase(productCode1, true),
    });
  typia.assert(product1);

  const product2: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBase(productCode2, false),
    });
  typia.assert(product2);

  // Create SKUs with different prices under each product
  const skuCreateBody = (
    skuCode: string,
    name: string,
    listPrice: number,
    salePrice: number,
  ) =>
    ({
      code: skuCode,
      name,
      listPrice,
      salePrice,
      currency: "USD",
      isActive: true,
      isPurchasable: true,
    }) satisfies IShoppingMallProductSku.ICreate;

  const sku1: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: productCode1,
      body: skuCreateBody(
        `sku-${RandomGenerator.alphaNumeric(6)}`,
        "P1 Low Price",
        100,
        80,
      ),
    });
  typia.assert(sku1);

  const sku2: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: productCode1,
      body: skuCreateBody(
        `sku-${RandomGenerator.alphaNumeric(6)}`,
        "P1 High Price",
        300,
        250,
      ),
    });
  typia.assert(sku2);

  const sku3: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: productCode2,
      body: skuCreateBody(
        `sku-${RandomGenerator.alphaNumeric(6)}`,
        "P2 Mid Price",
        200,
        180,
      ),
    });
  typia.assert(sku3);

  // Create inventory items for each SKU
  const inventoryCreateBody = (skuId: string) =>
    ({
      product_sku_id: skuId,
      on_hand_quantity: 100,
      low_stock_threshold: 10,
      backorder_enabled: false,
      preorder_enabled: false,
    }) satisfies IShoppingMallInventoryItem.ICreate;

  const inventory1: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody(sku1.id),
    });
  typia.assert(inventory1);

  const inventory2: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody(sku2.id),
    });
  typia.assert(inventory2);

  const inventory3: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody(sku3.id),
    });
  typia.assert(inventory3);

  // 4. Switch back to customer context and create a cart and items
  const customerLoginAgain: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginAgain);

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
      { body: cartCreateBody },
    );
  typia.assert(cart);

  // Helper to add item to cart
  const addCartItem = async (
    skuId: string & tags.Format<"uuid">,
    quantity: number,
  ): Promise<IShoppingMallCustomerCartItem> => {
    const body = {
      skuId,
      quantity,
      note: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallCustomerCartItem.ICreate;
    const item: IShoppingMallCustomerCartItem =
      await api.functional.shoppingMall.customer.customerCarts.items.create(
        connection,
        {
          customerCartId: cart.id,
          body,
        },
      );
    typia.assert(item);
    return item;
  };

  // 5. Create three orders at different amounts using the cart snapshot
  // Order A: low value (1 x sku1)
  const itemA = await addCartItem(sku1.id, 1);
  const orderACreateBody = {
    customer_cart_id: cart.id,
    currency_code: "USD",
    items_subtotal_amount: sku1.salePrice * itemA.quantity,
    discount_total_amount: 0,
    shipping_total_amount: 10,
    tax_total_amount: 0,
    grand_total_amount: sku1.salePrice * itemA.quantity + 10 + 0 - 0,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Order A - low value",
  } satisfies IShoppingMallOrder.ICreate;
  const orderA: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderACreateBody,
    });
  typia.assert(orderA);

  // Order B: mid value (2 x sku3 + shipping)
  const itemB1 = await addCartItem(sku3.id, 2);
  const subtotalB = sku3.salePrice * itemB1.quantity;
  const orderBCreateBody = {
    customer_cart_id: cart.id,
    currency_code: "USD",
    items_subtotal_amount: subtotalB,
    discount_total_amount: 0,
    shipping_total_amount: 15,
    tax_total_amount: 0,
    grand_total_amount: subtotalB + 15,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Order B - mid value",
  } satisfies IShoppingMallOrder.ICreate;
  const orderB: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBCreateBody,
    });
  typia.assert(orderB);

  // Order C: high value (1 x sku2 + 1 x sku3)
  const itemC1 = await addCartItem(sku2.id, 1);
  const itemC2 = await addCartItem(sku3.id, 1);
  const subtotalC =
    sku2.salePrice * itemC1.quantity + sku3.salePrice * itemC2.quantity;
  const orderCCreateBody = {
    customer_cart_id: cart.id,
    currency_code: "USD",
    items_subtotal_amount: subtotalC,
    discount_total_amount: 0,
    shipping_total_amount: 20,
    tax_total_amount: 0,
    grand_total_amount: subtotalC + 20,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Order C - high value",
  } satisfies IShoppingMallOrder.ICreate;
  const orderC: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCCreateBody,
    });
  typia.assert(orderC);

  // 6. Baseline search: fetch all orders for this customer
  const baseSearchBody = {
    page: 1,
    limit: 50,
    sortBy: "placedAt",
    sortDirection: "desc",
    includeDeleted: false,
  } satisfies IShoppingMallOrder.IRequest;
  const basePage: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.customer.orders.search.index(connection, {
      body: baseSearchBody,
    });
  typia.assert(basePage);

  const summaries = basePage.data;

  // Ensure we have at least 3 orders in baseline set
  TestValidator.predicate(
    "baseline search contains at least three orders",
    summaries.length >= 3,
  );

  // Assert all orders belong to authenticated customer when summary.customer is present
  await ArrayUtil.asyncForEach(summaries, async (summary) => {
    if (summary.customer !== undefined) {
      TestValidator.equals(
        "summary.customer.id matches logged-in customer",
        summary.customer.id,
        customerAuthorized.customer.id,
      );
    }
  });

  // 7a. Date range filter targeting the newest order
  const sortedByPlacedAtDesc = [...summaries].sort((a, b) =>
    a.placed_at < b.placed_at ? 1 : a.placed_at > b.placed_at ? -1 : 0,
  );
  const newest = sortedByPlacedAtDesc[0];

  const dateRangeBody = {
    page: 1,
    limit: 50,
    placedAtFrom: newest.placed_at,
    placedAtTo: newest.placed_at,
    sortBy: "placedAt",
    sortDirection: "desc",
  } satisfies IShoppingMallOrder.IRequest;
  const dateRangePage: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.customer.orders.search.index(connection, {
      body: dateRangeBody,
    });
  typia.assert(dateRangePage);

  const dateFiltered = dateRangePage.data;
  await ArrayUtil.asyncForEach(dateFiltered, async (summary) => {
    TestValidator.predicate(
      "order placed_at within single-value date range",
      summary.placed_at >= newest.placed_at &&
        summary.placed_at <= newest.placed_at,
    );
  });

  // All dateFiltered IDs must be subset of baseline IDs
  const baseIds = summaries.map((s) => s.id);
  const dateIds = dateFiltered.map((s) => s.id);
  TestValidator.predicate(
    "date-filtered orders are subset of baseline orders",
    dateIds.every((id) => baseIds.includes(id)),
  );

  // 7b. Status filter using one status from baseline
  const statusSet = new Set(summaries.map((s) => s.status));
  const [statusForFilter] = Array.from(statusSet);

  const statusFilterBody = {
    page: 1,
    limit: 50,
    orderStatuses: [statusForFilter],
    sortBy: "placedAt",
    sortDirection: "desc",
  } satisfies IShoppingMallOrder.IRequest;
  const statusPage: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.customer.orders.search.index(connection, {
      body: statusFilterBody,
    });
  typia.assert(statusPage);

  const statusFiltered = statusPage.data;
  await ArrayUtil.asyncForEach(statusFiltered, async (summary) => {
    TestValidator.predicate(
      "summary status matches requested status set",
      summary.status === statusForFilter,
    );
  });

  const baseIdsWithOtherStatus = summaries
    .filter((s) => s.status !== statusForFilter)
    .map((s) => s.id);
  TestValidator.predicate(
    "no order with different status appears in status-filtered result",
    statusFiltered.every((s) => !baseIdsWithOtherStatus.includes(s.id)),
  );

  // 7c. Monetary grand total range filters
  const totals = summaries.map((s) => s.total_amount);
  const minTotal = Math.min(...totals);
  const maxTotal = Math.max(...totals);

  const lowRangeBody = {
    page: 1,
    limit: 50,
    grandTotalAmountMin: minTotal,
    grandTotalAmountMax: minTotal,
    sortBy: "placedAt",
    sortDirection: "desc",
  } satisfies IShoppingMallOrder.IRequest;
  const lowRangePage: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.customer.orders.search.index(connection, {
      body: lowRangeBody,
    });
  typia.assert(lowRangePage);

  const lowRangeSummaries = lowRangePage.data;
  await ArrayUtil.asyncForEach(lowRangeSummaries, async (summary) => {
    TestValidator.predicate(
      "order total_amount within low range",
      summary.total_amount >= minTotal && summary.total_amount <= minTotal,
    );
  });
  const expectedLowIds = summaries
    .filter((s) => s.total_amount >= minTotal && s.total_amount <= minTotal)
    .map((s) => s.id);
  const actualLowIds = lowRangeSummaries.map((s) => s.id);
  TestValidator.equals(
    "low-range filtered order IDs match expected",
    actualLowIds.sort(),
    expectedLowIds.sort(),
  );

  const highRangeBody = {
    page: 1,
    limit: 50,
    grandTotalAmountMin: maxTotal,
    grandTotalAmountMax: maxTotal,
    sortBy: "placedAt",
    sortDirection: "desc",
  } satisfies IShoppingMallOrder.IRequest;
  const highRangePage: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.customer.orders.search.index(connection, {
      body: highRangeBody,
    });
  typia.assert(highRangePage);

  const highRangeSummaries = highRangePage.data;
  await ArrayUtil.asyncForEach(highRangeSummaries, async (summary) => {
    TestValidator.predicate(
      "order total_amount within high range",
      summary.total_amount >= maxTotal && summary.total_amount <= maxTotal,
    );
  });
  const expectedHighIds = summaries
    .filter((s) => s.total_amount >= maxTotal && s.total_amount <= maxTotal)
    .map((s) => s.id);
  const actualHighIds = highRangeSummaries.map((s) => s.id);
  TestValidator.equals(
    "high-range filtered order IDs match expected",
    actualHighIds.sort(),
    expectedHighIds.sort(),
  );

  // 8. includeDeleted=false equivalence with default behavior
  const explicitIncludeDeletedFalseBody = {
    page: 1,
    limit: 50,
    sortBy: "placedAt",
    sortDirection: "desc",
    includeDeleted: false,
  } satisfies IShoppingMallOrder.IRequest;
  const explicitFalsePage: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.customer.orders.search.index(connection, {
      body: explicitIncludeDeletedFalseBody,
    });
  typia.assert(explicitFalsePage);

  TestValidator.equals(
    "explicit includeDeleted=false produces same data as baseline",
    explicitFalsePage.data.map((s) => s.id).sort(),
    summaries.map((s) => s.id).sort(),
  );
}
