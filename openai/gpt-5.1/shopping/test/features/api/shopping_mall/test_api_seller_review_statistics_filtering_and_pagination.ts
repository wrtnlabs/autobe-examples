import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductReviewStatisticsBySeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductReviewStatisticsBySeller";
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
import type { IShoppingMallProductReviewStatisticsBySeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatisticsBySeller";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_seller_review_statistics_filtering_and_pagination(
  connection: api.IConnection,
) {
  // 1. Join and login as platform admin
  const platformAdminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    name: RandomGenerator.name(2),
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  const platformAdminLoginBody = {
    email: platformAdmin.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 2. Join and login as first seller
  const seller1Email = `${RandomGenerator.alphabets(8)}@seller1.example.com`;
  const seller1JoinBody = {
    email: seller1Email,
    password: "Seller1Pass!",
    storeName: `Store-${RandomGenerator.alphabets(6)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller1Auth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: seller1JoinBody,
    });
  typia.assert(seller1Auth);

  const seller1LoginBody = {
    email: seller1Email,
    password: seller1JoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const seller1LoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: seller1LoginBody,
    });
  typia.assert(seller1LoggedIn);

  // 3. Join and login as customer
  const customerEmail = `${RandomGenerator.alphabets(8)}@customer.example.com`;
  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPass123!",
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  const customerLoginBody = {
    email: customerEmail,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
    userAgent: "E2E-Test-Agent/1.0",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 4. As platform admin, create category tree and brand
  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphabets(6)}`,
    name: "Default Category Tree",
    description: "E2E category tree for review statistics tests",
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
    name: `Brand-${RandomGenerator.alphabets(6)}`,
    slug: `brand-${RandomGenerator.alphabets(6)}`,
    description: "E2E brand for review statistics tests",
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 5. As seller1, create a product with multi SKU
  const seller1ProductCode = `prod-${RandomGenerator.alphabets(8)}`;
  const productCreateBody1 = {
    shopping_mall_seller_id: seller1Auth.id,
    shopping_mall_brand_id: brand.id,
    code: seller1ProductCode,
    name: `Product-${RandomGenerator.alphabets(6)}`,
    short_description: "E2E product for seller1 review stats",
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const seller1Product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody1,
    });
  typia.assert(seller1Product);

  // 6. As platform admin, create three SKUs for seller1's product
  const skuBodies1 = [
    {
      code: `${seller1Product.code}-sku1`,
      name: "Variant 1",
      listPrice: 100,
      salePrice: 90,
      currency: "USD",
      isActive: true,
      isPurchasable: true,
    },
    {
      code: `${seller1Product.code}-sku2`,
      name: "Variant 2",
      listPrice: 120,
      salePrice: 110,
      currency: "USD",
      isActive: true,
      isPurchasable: true,
    },
    {
      code: `${seller1Product.code}-sku3`,
      name: "Variant 3",
      listPrice: 150,
      salePrice: 140,
      currency: "USD",
      isActive: true,
      isPurchasable: true,
    },
  ] satisfies IShoppingMallProductSku.ICreate[];

  const seller1Skus: IShoppingMallProductSku[] = [];
  for (const skuBody of skuBodies1) {
    const sku =
      await api.functional.shoppingMall.platformAdmin.products.skus.create(
        connection,
        {
          productCode: seller1Product.code,
          body: skuBody,
        },
      );
    typia.assert(sku);
    seller1Skus.push(sku);
  }

  // 7. As customer, create a cart and add one SKU, then create an order
  const customerCartCreateBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {},
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const customerCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: customerCartCreateBody,
      },
    );
  typia.assert(customerCart);

  const cartItemCreateBody = {
    skuId: seller1Skus[0].id,
    quantity: 1,
    note: "Test cart item",
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

  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  const billingAddressId = typia.random<string & tags.Format<"uuid">>();

  const orderCreateBody = {
    customer_cart_id: customerCart.id,
    currency_code: customerCart.currency_code,
    items_subtotal_amount: 90,
    discount_total_amount: 0,
    shipping_total_amount: 0,
    tax_total_amount: 0,
    grand_total_amount: 90,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "E2E test order",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 8. As customer, create product and SKU reviews with specific ratings
  const reviewDefinitions: { rating: number; forSku: boolean }[] = [
    { rating: 5, forSku: false },
    { rating: 5, forSku: true },
    { rating: 3, forSku: false },
    { rating: 4, forSku: true },
    { rating: 1, forSku: false },
  ];

  const createdReviews: IShoppingMallProductReview[] = [];

  for (const def of reviewDefinitions) {
    const body = {
      rating: def.rating,
      title: `Rating ${def.rating} review`,
      body: RandomGenerator.paragraph({ sentences: 5 }),
    } satisfies IShoppingMallProductReview.ICreate;

    const review: IShoppingMallProductReview = def.forSku
      ? await api.functional.shoppingMall.customer.products.skus.reviews.create(
          connection,
          {
            productId: seller1Product.id,
            skuId: seller1Skus[0].id,
            body,
          },
        )
      : await api.functional.shoppingMall.customer.products.reviews.create(
          connection,
          {
            productId: seller1Product.id,
            body,
          },
        );

    typia.assert(review);
    createdReviews.push(review);
  }

  // Count reviews per rating for later assertions
  const ratingCounts: Record<number, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  for (const r of reviewDefinitions) {
    ratingCounts[r.rating] = (ratingCounts[r.rating] ?? 0) + 1;
  }

  const totalReviews = Object.values(ratingCounts).reduce(
    (sum, v) => sum + v,
    0,
  );

  TestValidator.equals(
    "total reviews count equals definitions length",
    totalReviews,
    reviewDefinitions.length,
  );

  const pastIso = "2000-01-01T00:00:00.000Z";
  const farFutureIso = "2100-01-01T00:00:00.000Z";

  // Helper to find statistics entry for a given sellerId
  const findStatsForSeller = (
    page: IPageIShoppingMallProductReviewStatisticsBySeller,
    sellerId: string,
  ): IShoppingMallProductReviewStatisticsBySeller | undefined => {
    return page.data.find((row) => row.sellerId === sellerId);
  };

  // Baseline: no rating or date filters
  const baselineRequestBody = {
    sellerIds: [seller1Auth.id],
    productIds: undefined,
    categoryIds: undefined,
    minRating: undefined,
    maxRating: undefined,
    fromCreatedAt: undefined,
    toCreatedAt: undefined,
    includePending: false,
    includeRejected: false,
    regionCodes: undefined,
    limit: undefined,
    offset: undefined,
    orderBy: "sellerId",
    orderDirection: "asc",
  } satisfies IShoppingMallProductReviewStatisticsBySeller.IRequest;

  const baselinePage: IPageIShoppingMallProductReviewStatisticsBySeller =
    await api.functional.shoppingMall.seller.reviews.statistics.bySeller.index(
      connection,
      {
        body: baselineRequestBody,
      },
    );
  typia.assert(baselinePage);

  const baselineStats = findStatsForSeller(baselinePage, seller1Auth.id);
  TestValidator.predicate(
    "baseline stats for seller1 should exist",
    baselineStats !== undefined,
  );

  if (baselineStats !== undefined) {
    const sumBuckets =
      baselineStats.ratingCount1 +
      baselineStats.ratingCount2 +
      baselineStats.ratingCount3 +
      baselineStats.ratingCount4 +
      baselineStats.ratingCount5;

    TestValidator.equals(
      "baseline totalReviewCount equals sum of buckets",
      baselineStats.totalReviewCount,
      sumBuckets,
    );

    TestValidator.equals(
      "baseline ratingCount1 equals number of 1-star reviews",
      baselineStats.ratingCount1,
      ratingCounts[1],
    );
    TestValidator.equals(
      "baseline ratingCount3 equals number of 3-star reviews",
      baselineStats.ratingCount3,
      ratingCounts[3],
    );
    TestValidator.equals(
      "baseline ratingCount4 equals number of 4-star reviews",
      baselineStats.ratingCount4,
      ratingCounts[4],
    );
    TestValidator.equals(
      "baseline ratingCount5 equals number of 5-star reviews",
      baselineStats.ratingCount5,
      ratingCounts[5],
    );
  }

  // Mid-range: ratings 3–4, wide date range
  const midRangeRequestBody = {
    sellerIds: [seller1Auth.id],
    productIds: undefined,
    categoryIds: undefined,
    minRating: 3,
    maxRating: 4,
    fromCreatedAt: pastIso,
    toCreatedAt: farFutureIso,
    includePending: false,
    includeRejected: false,
    regionCodes: undefined,
    limit: undefined,
    offset: undefined,
    orderBy: "sellerId",
    orderDirection: "asc",
  } satisfies IShoppingMallProductReviewStatisticsBySeller.IRequest;

  const midRangePage: IPageIShoppingMallProductReviewStatisticsBySeller =
    await api.functional.shoppingMall.seller.reviews.statistics.bySeller.index(
      connection,
      {
        body: midRangeRequestBody,
      },
    );
  typia.assert(midRangePage);

  const midRangeStats = findStatsForSeller(midRangePage, seller1Auth.id);
  TestValidator.predicate(
    "mid-range stats for seller1 should exist",
    midRangeStats !== undefined,
  );

  if (midRangeStats !== undefined) {
    TestValidator.equals(
      "mid-range ratingCount1 is zero",
      midRangeStats.ratingCount1,
      0,
    );
    TestValidator.equals(
      "mid-range ratingCount2 is zero",
      midRangeStats.ratingCount2,
      0,
    );
    TestValidator.equals(
      "mid-range ratingCount5 is zero",
      midRangeStats.ratingCount5,
      0,
    );

    const expectedMidRange = (ratingCounts[3] ?? 0) + (ratingCounts[4] ?? 0);
    const midSumBuckets =
      midRangeStats.ratingCount1 +
      midRangeStats.ratingCount2 +
      midRangeStats.ratingCount3 +
      midRangeStats.ratingCount4 +
      midRangeStats.ratingCount5;

    TestValidator.equals(
      "mid-range sum buckets equals expected mid-range count",
      midSumBuckets,
      expectedMidRange,
    );

    TestValidator.equals(
      "mid-range totalReviewCount equals expected mid-range count",
      midRangeStats.totalReviewCount,
      expectedMidRange,
    );
  }

  // High rating: minRating=5 only
  const highRatingRequestBody = {
    sellerIds: [seller1Auth.id],
    productIds: undefined,
    categoryIds: undefined,
    minRating: 5,
    maxRating: undefined,
    fromCreatedAt: pastIso,
    toCreatedAt: farFutureIso,
    includePending: false,
    includeRejected: false,
    regionCodes: undefined,
    limit: undefined,
    offset: undefined,
    orderBy: "sellerId",
    orderDirection: "asc",
  } satisfies IShoppingMallProductReviewStatisticsBySeller.IRequest;

  const highRatingPage: IPageIShoppingMallProductReviewStatisticsBySeller =
    await api.functional.shoppingMall.seller.reviews.statistics.bySeller.index(
      connection,
      {
        body: highRatingRequestBody,
      },
    );
  typia.assert(highRatingPage);

  const highRatingStats = findStatsForSeller(highRatingPage, seller1Auth.id);
  TestValidator.predicate(
    "high-rating stats for seller1 should exist",
    highRatingStats !== undefined,
  );

  if (highRatingStats !== undefined) {
    TestValidator.equals(
      "high-rating ratingCount1 is zero",
      highRatingStats.ratingCount1,
      0,
    );
    TestValidator.equals(
      "high-rating ratingCount2 is zero",
      highRatingStats.ratingCount2,
      0,
    );
    TestValidator.equals(
      "high-rating ratingCount3 is zero",
      highRatingStats.ratingCount3,
      0,
    );
    TestValidator.equals(
      "high-rating ratingCount4 is zero",
      highRatingStats.ratingCount4,
      0,
    );

    const expectedHigh = ratingCounts[5] ?? 0;
    TestValidator.equals(
      "high-rating ratingCount5 equals number of 5-star reviews",
      highRatingStats.ratingCount5,
      expectedHigh,
    );

    TestValidator.equals(
      "high-rating totalReviewCount equals expectedHigh",
      highRatingStats.totalReviewCount,
      expectedHigh,
    );

    if (expectedHigh > 0) {
      TestValidator.equals(
        "high-rating averageRating is 5 when only 5-star reviews counted",
        highRatingStats.averageRating,
        5,
      );
    }
  }

  // Date window that yields no results: future range with no reviews
  const emptyDateRequestBody = {
    sellerIds: [seller1Auth.id],
    productIds: undefined,
    categoryIds: undefined,
    minRating: undefined,
    maxRating: undefined,
    fromCreatedAt: farFutureIso,
    toCreatedAt: farFutureIso,
    includePending: false,
    includeRejected: false,
    regionCodes: undefined,
    limit: 10,
    offset: 0,
    orderBy: "sellerId",
    orderDirection: "asc",
  } satisfies IShoppingMallProductReviewStatisticsBySeller.IRequest;

  const emptyDatePage: IPageIShoppingMallProductReviewStatisticsBySeller =
    await api.functional.shoppingMall.seller.reviews.statistics.bySeller.index(
      connection,
      {
        body: emptyDateRequestBody,
      },
    );
  typia.assert(emptyDatePage);

  TestValidator.equals(
    "empty-date page has no data rows",
    emptyDatePage.data.length,
    0,
  );

  // 10. Pagination tests with a second seller
  // Join and login as second seller
  const seller2Email = `${RandomGenerator.alphabets(8)}@seller2.example.com`;
  const seller2JoinBody = {
    email: seller2Email,
    password: "Seller2Pass!",
    storeName: `Store2-${RandomGenerator.alphabets(6)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller2Auth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: seller2JoinBody,
    });
  typia.assert(seller2Auth);

  const seller2LoginBody = {
    email: seller2Email,
    password: seller2JoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const seller2LoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: seller2LoginBody,
    });
  typia.assert(seller2LoggedIn);

  // As seller2, create product and one SKU and at least one review via customer
  const seller2ProductCode = `prod-${RandomGenerator.alphabets(8)}`;
  const productCreateBody2 = {
    shopping_mall_seller_id: seller2Auth.id,
    shopping_mall_brand_id: brand.id,
    code: seller2ProductCode,
    name: `Product2-${RandomGenerator.alphabets(6)}`,
    short_description: "E2E product for seller2 review stats",
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product2.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const seller2Product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody2,
    });
  typia.assert(seller2Product);

  const seller2SkuBody = {
    code: `${seller2Product.code}-sku1`,
    name: "Variant A",
    listPrice: 80,
    salePrice: 70,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const seller2Sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: seller2Product.code,
        body: seller2SkuBody,
      },
    );
  typia.assert(seller2Sku);

  // Re-use customer to create one review for seller2's product
  const seller2ReviewBody = {
    rating: 4,
    title: "Seller2 product review",
    body: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallProductReview.ICreate;

  const seller2Review: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: seller2Product.id,
        body: seller2ReviewBody,
      },
    );
  typia.assert(seller2Review);

  // Pagination: limit=1, offset=0 and 1 without sellerIds filter
  const paginationRequestPage1 = {
    sellerIds: undefined,
    productIds: undefined,
    categoryIds: undefined,
    minRating: undefined,
    maxRating: undefined,
    fromCreatedAt: undefined,
    toCreatedAt: undefined,
    includePending: false,
    includeRejected: false,
    regionCodes: undefined,
    limit: 1,
    offset: 0,
    orderBy: "sellerId",
    orderDirection: "asc",
  } satisfies IShoppingMallProductReviewStatisticsBySeller.IRequest;

  const page1: IPageIShoppingMallProductReviewStatisticsBySeller =
    await api.functional.shoppingMall.seller.reviews.statistics.bySeller.index(
      connection,
      {
        body: paginationRequestPage1,
      },
    );
  typia.assert(page1);

  TestValidator.equals(
    "pagination page1 limit is 1",
    page1.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination page1 has at least one record",
    page1.pagination.records >= 1,
  );

  const page1SellerIds = page1.data.map((row) => row.sellerId);

  const paginationRequestPage2 = {
    sellerIds: undefined,
    productIds: undefined,
    categoryIds: undefined,
    minRating: undefined,
    maxRating: undefined,
    fromCreatedAt: undefined,
    toCreatedAt: undefined,
    includePending: false,
    includeRejected: false,
    regionCodes: undefined,
    limit: 1,
    offset: 1,
    orderBy: "sellerId",
    orderDirection: "asc",
  } satisfies IShoppingMallProductReviewStatisticsBySeller.IRequest;

  const page2: IPageIShoppingMallProductReviewStatisticsBySeller =
    await api.functional.shoppingMall.seller.reviews.statistics.bySeller.index(
      connection,
      {
        body: paginationRequestPage2,
      },
    );
  typia.assert(page2);

  TestValidator.equals(
    "pagination page2 limit is 1",
    page2.pagination.limit,
    1,
  );

  const page2SellerIds = page2.data.map((row) => row.sellerId);

  if (page2SellerIds.length > 0 && page1SellerIds.length > 0) {
    TestValidator.notEquals(
      "page1 and page2 sellerIds differ when multiple sellers exist",
      page1SellerIds[0],
      page2SellerIds[0],
    );
  }

  // Offset far beyond range
  const largeOffset = page1.pagination.records + 100;
  const paginationRequestBeyond = {
    sellerIds: undefined,
    productIds: undefined,
    categoryIds: undefined,
    minRating: undefined,
    maxRating: undefined,
    fromCreatedAt: undefined,
    toCreatedAt: undefined,
    includePending: false,
    includeRejected: false,
    regionCodes: undefined,
    limit: 1,
    offset: largeOffset,
    orderBy: "sellerId",
    orderDirection: "asc",
  } satisfies IShoppingMallProductReviewStatisticsBySeller.IRequest;

  const pageBeyond: IPageIShoppingMallProductReviewStatisticsBySeller =
    await api.functional.shoppingMall.seller.reviews.statistics.bySeller.index(
      connection,
      {
        body: paginationRequestBeyond,
      },
    );
  typia.assert(pageBeyond);

  TestValidator.equals(
    "pagination beyond-range yields empty data",
    pageBeyond.data.length,
    0,
  );

  TestValidator.equals(
    "pagination beyond-range keeps records stable",
    pageBeyond.pagination.records,
    page1.pagination.records,
  );
}
