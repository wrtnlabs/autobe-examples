import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductReview";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_public_search_reviews_for_sku_respects_verified_purchase_and_media_flags(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and logs in (join already authenticates and sets Authorization)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a category tree (not strictly required for later calls but realistic)
  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog",
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 3. Create a brand
  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.shoppingmall.local/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4. Create a product under a random seller UUID and the new brand
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const productCode = `PROD-${RandomGenerator.alphaNumeric(10)}`;

  const productCreateBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: `Test Product ${RandomGenerator.name(1)}` as string &
      tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.shoppingmall.local/product.png",
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

  // 5. Create a SKU for the product
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`;

  const skuCreateBody = {
    code: skuCode,
    name: `Variant ${RandomGenerator.name(1)}`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: product.code,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  const productId = product.id;
  const skuId = sku.id;

  // 6. Register two customers A and B
  const commonCustomerJoinFields = () => ({
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://shoppingmall.local/join",
    referrer: "https://shoppingmall.local/",
  });

  const customerAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerAPassword = RandomGenerator.alphaNumeric(12);

  const customerAJoinBody = {
    email: customerAEmail,
    password: customerAPassword,
    name: RandomGenerator.name(),
    ip: commonCustomerJoinFields().ip,
    href: commonCustomerJoinFields().href,
    referrer: commonCustomerJoinFields().referrer,
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert(customerAAuthorized);

  const customerBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerBPassword = RandomGenerator.alphaNumeric(12);

  const customerBJoinBody = {
    email: customerBEmail,
    password: customerBPassword,
    name: RandomGenerator.name(),
    ip: commonCustomerJoinFields().ip,
    href: commonCustomerJoinFields().href,
    referrer: commonCustomerJoinFields().referrer,
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerBAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinBody,
    });
  typia.assert(customerBAuthorized);

  // 7. As customer A, create a cart, add SKU, create an order, and write two reviews
  // login as customer A (join already logged in, but login call is part of dependencies)
  const customerALoginBody = {
    email: customerAEmail,
    password: customerAPassword,
    ip: null,
    href: "https://shoppingmall.local/login",
    referrer: "https://shoppingmall.local/",
    userAgent: "E2E-Test-Agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerALoginAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerALoginBody,
    });
  typia.assert(customerALoginAuth);

  const cartCreateBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: {
      source: "e2e-test",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const customerCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartCreateBody,
      },
    );
  typia.assert(customerCart);

  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "E2E test cart item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: customerCart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);

  const orderCreateBody = {
    customer_cart_id: customerCart.id,
    currency_code: customerCart.currency_code,
    items_subtotal_amount: customerCart.subtotal_amount,
    discount_total_amount: customerCart.discount_amount,
    shipping_total_amount: customerCart.shipping_amount,
    tax_total_amount: customerCart.tax_amount,
    grand_total_amount: customerCart.total_amount,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "E2E test order",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // Customer A: create two reviews
  const reviewABody1 = {
    rating: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Great SKU from customer A",
    body: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallProductReview.ICreate;

  const reviewA1: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.skus.reviews.create(
      connection,
      {
        productId: productId,
        skuId: skuId,
        body: reviewABody1,
      },
    );
  typia.assert(reviewA1);

  const reviewABody2 = {
    rating: 4 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Another positive review from A",
    body: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallProductReview.ICreate;

  const reviewA2: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.skus.reviews.create(
      connection,
      {
        productId: productId,
        skuId: skuId,
        body: reviewABody2,
      },
    );
  typia.assert(reviewA2);

  // 8. As customer B, login and create an additional review without purchase flow
  const customerBLoginBody = {
    email: customerBEmail,
    password: customerBPassword,
    ip: null,
    href: "https://shoppingmall.local/login",
    referrer: "https://shoppingmall.local/",
    userAgent: "E2E-Test-Agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerBLoginAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerBLoginBody,
    });
  typia.assert(customerBLoginAuth);

  const reviewBBody = {
    rating: 3 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "B's neutral review",
    body: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallProductReview.ICreate;

  const reviewB: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.skus.reviews.create(
      connection,
      {
        productId: productId,
        skuId: skuId,
        body: reviewBBody,
      },
    );
  typia.assert(reviewB);

  // 9. Public search: baseline (no hasMedia / verifiedPurchaseOnly filters)
  const baselineRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    orderBy: "createdAt" as const,
    orderDirection: "desc" as const,
    minRating: undefined,
    maxRating: undefined,
    fromCreatedAt: undefined,
    toCreatedAt: undefined,
    hasMedia: undefined,
    verifiedPurchaseOnly: undefined,
    status: "published" as const,
  } satisfies IShoppingMallProductReview.IRequest;

  const baselinePage: IPageIShoppingMallProductReview.ISummary =
    await api.functional.shoppingMall.products.skus.reviews.index(connection, {
      productId: productId,
      skuId: skuId,
      body: baselineRequest,
    });
  typia.assert(baselinePage);

  const baselineIds = baselinePage.data.map((summary) => summary.review_id);

  TestValidator.predicate(
    "baseline search should return at least three reviews for the SKU",
    baselineIds.length >= 3,
  );

  // 10. Public search: hasMedia=true
  const hasMediaTrueRequest = {
    ...baselineRequest,
    hasMedia: true,
  } satisfies IShoppingMallProductReview.IRequest;

  const hasMediaTruePage: IPageIShoppingMallProductReview.ISummary =
    await api.functional.shoppingMall.products.skus.reviews.index(connection, {
      productId: productId,
      skuId: skuId,
      body: hasMediaTrueRequest,
    });
  typia.assert(hasMediaTruePage);

  const hasMediaTrueIds = hasMediaTruePage.data.map(
    (summary) => summary.review_id,
  );

  // All results with hasMedia=true must expose has_media flag true
  for (const summary of hasMediaTruePage.data) {
    TestValidator.predicate(
      "hasMedia=true filter must only return summaries with has_media=true",
      summary.has_media === true,
    );
  }

  // hasMedia=true results must be a subset of baseline
  for (const id of hasMediaTrueIds) {
    TestValidator.predicate(
      "hasMedia=true result IDs are subset of baseline IDs",
      baselineIds.includes(id),
    );
  }

  // 11. Public search: hasMedia=false
  const hasMediaFalseRequest = {
    ...baselineRequest,
    hasMedia: false,
  } satisfies IShoppingMallProductReview.IRequest;

  const hasMediaFalsePage: IPageIShoppingMallProductReview.ISummary =
    await api.functional.shoppingMall.products.skus.reviews.index(connection, {
      productId: productId,
      skuId: skuId,
      body: hasMediaFalseRequest,
    });
  typia.assert(hasMediaFalsePage);

  const hasMediaFalseIds = hasMediaFalsePage.data.map(
    (summary) => summary.review_id,
  );

  for (const summary of hasMediaFalsePage.data) {
    TestValidator.predicate(
      "hasMedia=false filter must only return summaries with has_media=false",
      summary.has_media === false,
    );
  }

  for (const id of hasMediaFalseIds) {
    TestValidator.predicate(
      "hasMedia=false result IDs are subset of baseline IDs",
      baselineIds.includes(id),
    );
  }

  // 12. The union of hasMedia=true and hasMedia=false ID sets should still be a subset of baseline IDs
  const unionIds = Array.from(
    new Set([...hasMediaTrueIds, ...hasMediaFalseIds]),
  );
  for (const id of unionIds) {
    TestValidator.predicate(
      "union of hasMedia=true/false IDs is subset of baseline IDs",
      baselineIds.includes(id),
    );
  }

  // 13. Optional: verifiedPurchaseOnly=true should only narrow the baseline, if supported
  const verifiedOnlyRequest = {
    ...baselineRequest,
    verifiedPurchaseOnly: true,
  } satisfies IShoppingMallProductReview.IRequest;

  const verifiedOnlyPage: IPageIShoppingMallProductReview.ISummary =
    await api.functional.shoppingMall.products.skus.reviews.index(connection, {
      productId: productId,
      skuId: skuId,
      body: verifiedOnlyRequest,
    });
  typia.assert(verifiedOnlyPage);

  const verifiedOnlyIds = verifiedOnlyPage.data.map(
    (summary) => summary.review_id,
  );

  for (const id of verifiedOnlyIds) {
    TestValidator.predicate(
      "verifiedPurchaseOnly=true result IDs are subset of baseline IDs",
      baselineIds.includes(id),
    );
  }

  // Sanity check: pagination metadata should be self-consistent
  TestValidator.predicate(
    "baseline pagination records should not be less than returned data length",
    baselinePage.pagination.records >= baselinePage.data.length,
  );

  TestValidator.predicate(
    "hasMedia=true pagination records should not be less than data length",
    hasMediaTruePage.pagination.records >= hasMediaTruePage.data.length,
  );

  TestValidator.predicate(
    "hasMedia=false pagination records should not be less than data length",
    hasMediaFalsePage.pagination.records >= hasMediaFalsePage.data.length,
  );

  TestValidator.predicate(
    "verifiedPurchaseOnly pagination records should not be less than data length",
    verifiedOnlyPage.pagination.records >= verifiedOnlyPage.data.length,
  );
}
