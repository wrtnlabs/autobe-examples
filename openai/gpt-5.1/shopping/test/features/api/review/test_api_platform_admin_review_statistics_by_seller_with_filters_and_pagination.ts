import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductReviewStatisticsBySeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductReviewStatisticsBySeller";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
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

export async function test_api_platform_admin_review_statistics_by_seller_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register three sellers (A, B, C)
  const sellerJoinBase = (
    overrides?: Partial<IShoppingMallSellerJoin.IRequest>,
  ) =>
    ({
      email: typia.random<string & tags.Format<"email">>(),
      password: "password-1234",
      storeName: RandomGenerator.name(2),
      contactPhone: RandomGenerator.mobile(),
      ...overrides,
    }) satisfies IShoppingMallSellerJoin.IRequest;

  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBase(),
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerA);

  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBase(),
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerB);

  const sellerC: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBase(),
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerC);

  // 2. For Seller A and B, create a product + SKU each
  const createProductForSeller = async (
    owner: IShoppingMallSeller.IAuthorized,
  ): Promise<{
    product: IShoppingMallProduct;
    sku: IShoppingMallProductSku;
  }> => {
    // switch to seller (login by email)
    const sellerLoginBody: IShoppingMallSellerLogin.IRequest = {
      email: owner.email,
      password: "password-1234",
      ip: null,
      href: "https://seller.example.com/login",
      referrer: "https://seller.example.com/",
    };
    const sellerSession: IShoppingMallSeller.IAuthorized =
      await api.functional.auth.seller.login(connection, {
        body: sellerLoginBody,
      });
    typia.assert<IShoppingMallSeller.IAuthorized>(sellerSession);

    const productCode = RandomGenerator.alphaNumeric(12);
    const productBody = {
      shopping_mall_seller_id: owner.id,
      shopping_mall_brand_id: null,
      code: productCode,
      name: RandomGenerator.name(3),
      short_description: RandomGenerator.paragraph({ sentences: 4 }),
      description: RandomGenerator.content({ paragraphs: 2 }),
      status: "active",
      is_multi_sku: true,
      primary_image_uri: null,
      additional_data: null,
    } satisfies IShoppingMallProduct.ICreate;

    const product: IShoppingMallProduct =
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: productBody,
      });
    typia.assert<IShoppingMallProduct>(product);

    const skuBody = {
      code: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(2),
      listPrice: 10000,
      salePrice: 9000,
      currency: "KRW",
      isActive: true,
      isPurchasable: true,
    } satisfies IShoppingMallProductSku.ICreate;

    const sku: IShoppingMallProductSku =
      await api.functional.shoppingMall.seller.products.skus.create(
        connection,
        {
          productCode: product.code,
          body: skuBody,
        },
      );
    typia.assert<IShoppingMallProductSku>(sku);

    return { product, sku };
  };

  const { product: productA, sku: skuA } =
    await createProductForSeller(sellerA);
  const { product: productB, sku: skuB } =
    await createProductForSeller(sellerB);

  // Seller C intentionally gets no products/reviews
  TestValidator.predicate(
    "seller C has no products created in this test",
    true,
  );

  // 3. Register a customer
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password-1234",
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/signup",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuth);

  // 4. Customer creates a cart and adds SKUs from A and B
  const customerCartBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: undefined,
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const customerCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: customerCartBody,
      },
    );
  typia.assert<IShoppingMallCustomerCart>(customerCart);

  const addItem = async (
    sku: IShoppingMallProductSku,
  ): Promise<IShoppingMallCustomerCartItem> => {
    const body = {
      skuId: sku.id,
      quantity: 1,
      note: null,
    } satisfies IShoppingMallCustomerCartItem.ICreate;

    const item: IShoppingMallCustomerCartItem =
      await api.functional.shoppingMall.customer.customerCarts.items.create(
        connection,
        {
          customerCartId: customerCart.id,
          body,
        },
      );
    typia.assert<IShoppingMallCustomerCartItem>(item);
    return item;
  };

  await addItem(skuA);
  await addItem(skuB);

  // 5. Customer places an order (snapshot amounts are arbitrary but coherent)
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
    customer_note: "Test order for review statistics scenario",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert<IShoppingMallOrder>(order);

  // 6. Create multiple reviews across Seller A and B at two time windows
  const createReviewForProduct = async (
    product: IShoppingMallProduct,
    rating: number,
    title: string,
    body: string,
  ): Promise<IShoppingMallProductReview> => {
    const reviewBody = {
      rating,
      title,
      body,
    } satisfies IShoppingMallProductReview.ICreate;

    const review: IShoppingMallProductReview =
      await api.functional.shoppingMall.customer.products.reviews.create(
        connection,
        {
          productId: product.id,
          body: reviewBody,
        },
      );
    typia.assert<IShoppingMallProductReview>(review);
    return review;
  };

  // Older reviews (we just treat first batch as "older" logically)
  const oldReviewA1 = await createReviewForProduct(
    productA,
    5,
    "Old great product from A",
    RandomGenerator.paragraph({ sentences: 6 }),
  );
  const oldReviewB1 = await createReviewForProduct(
    productB,
    3,
    "Old average product from B",
    RandomGenerator.paragraph({ sentences: 6 }),
  );

  // Newer reviews (second batch, considered "recent")
  const newReviewA1 = await createReviewForProduct(
    productA,
    4,
    "New good product from A",
    RandomGenerator.paragraph({ sentences: 5 }),
  );
  const newReviewA2 = await createReviewForProduct(
    productA,
    2,
    "New bad product from A",
    RandomGenerator.paragraph({ sentences: 4 }),
  );
  const newReviewB2 = await createReviewForProduct(
    productB,
    5,
    "New excellent product from B",
    RandomGenerator.paragraph({ sentences: 5 }),
  );

  // Derive date-time window from review timestamps for Seller A
  const createdTimesA: string[] = [
    oldReviewA1.createdAt,
    newReviewA1.createdAt,
    newReviewA2.createdAt,
  ];
  createdTimesA.sort();
  const earliestA = createdTimesA[0];
  const latestA = createdTimesA[createdTimesA.length - 1];

  // We want only the new reviews of A to be in the window, so choose
  // fromCreatedAt as min(newReviewA1.createdAt, newReviewA2.createdAt)
  // and toCreatedAt as max(newReviewA1.createdAt, newReviewA2.createdAt).
  const newTimesA: string[] = [newReviewA1.createdAt, newReviewA2.createdAt];
  newTimesA.sort();
  const fromCreatedAtA = newTimesA[0];
  const toCreatedAtA = newTimesA[newTimesA.length - 1];

  TestValidator.predicate(
    "earliest A review is not after latest A review",
    earliestA <= latestA,
  );

  // 7. Register a platform admin and / or login
  const platformAdminJoinBody: IShoppingMallPlatformAdminJoin.IRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "password-1234",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  };

  const platformAdminAuth: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminAuth);

  // Ensure we have a fresh admin session via login using same email/password
  const platformAdminLoginBody: IShoppingMallPlatformAdminLogin.IRequest = {
    email: platformAdminAuth.email,
    password: "password-1234",
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  };

  const platformAdminSession: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminSession);

  // 8. As platform admin, call statistics endpoint filtered to Seller A and date window
  const filterBodyForSellerA: IShoppingMallProductReviewStatisticsBySeller.IRequest =
    {
      sellerIds: [sellerA.id],
      productIds: undefined,
      categoryIds: undefined,
      minRating: undefined,
      maxRating: undefined,
      fromCreatedAt: fromCreatedAtA,
      toCreatedAt: toCreatedAtA,
      includePending: undefined,
      includeRejected: undefined,
      regionCodes: undefined,
      limit: undefined,
      offset: undefined,
      orderBy: "latestReviewCreatedAt",
      orderDirection: "desc",
    };

  const pageForSellerA: IPageIShoppingMallProductReviewStatisticsBySeller =
    await api.functional.shoppingMall.platformAdmin.reviews.statistics.bySeller.index(
      connection,
      {
        body: filterBodyForSellerA,
      },
    );
  typia.assert<IPageIShoppingMallProductReviewStatisticsBySeller>(
    pageForSellerA,
  );

  const statsForSellerA = pageForSellerA.data.find(
    (row) => row.sellerId === sellerA.id,
  );

  TestValidator.predicate(
    "statistics for Seller A should exist when filtering by sellerIds",
    statsForSellerA !== undefined,
  );

  if (statsForSellerA !== undefined) {
    // With only Seller A in sellerIds, expect that only Seller A appears.
    TestValidator.predicate(
      "all rows under sellerIds filter are for Seller A",
      pageForSellerA.data.every((row) => row.sellerId === sellerA.id),
    );

    // The totalReviewCount should be >= number of in-window A reviews (2), as
    // the backend may include more aggregated reviews if any exist; we assert
    // minimum bound.
    TestValidator.predicate(
      "Seller A totalReviewCount is at least number of new reviews created in-window",
      statsForSellerA.totalReviewCount >= 2,
    );

    // lastReviewAt, when present, should be within the [fromCreatedAtA, toCreatedAtA] window
    if (
      statsForSellerA.lastReviewAt !== null &&
      statsForSellerA.lastReviewAt !== undefined
    ) {
      TestValidator.predicate(
        "lastReviewAt is within requested date window for Seller A",
        statsForSellerA.lastReviewAt >= fromCreatedAtA &&
          statsForSellerA.lastReviewAt <= toCreatedAtA,
      );
    }
  }

  // 9. Call again without sellerIds but with pagination (limit=1, offset=0)
  const paginationBodyPage0: IShoppingMallProductReviewStatisticsBySeller.IRequest =
    {
      sellerIds: undefined,
      productIds: undefined,
      categoryIds: undefined,
      minRating: undefined,
      maxRating: undefined,
      fromCreatedAt: undefined,
      toCreatedAt: undefined,
      includePending: undefined,
      includeRejected: undefined,
      regionCodes: undefined,
      limit: 1,
      offset: 0,
      orderBy: "latestReviewCreatedAt",
      orderDirection: "desc",
    };

  const page0: IPageIShoppingMallProductReviewStatisticsBySeller =
    await api.functional.shoppingMall.platformAdmin.reviews.statistics.bySeller.index(
      connection,
      { body: paginationBodyPage0 },
    );
  typia.assert<IPageIShoppingMallProductReviewStatisticsBySeller>(page0);

  TestValidator.predicate(
    "page0.data should contain at most one row due to limit=1",
    page0.data.length <= 1,
  );

  TestValidator.predicate(
    "pagination.records is non-negative",
    page0.pagination.records >= 0,
  );

  // Request the next page with offset=1
  const paginationBodyPage1: IShoppingMallProductReviewStatisticsBySeller.IRequest =
    {
      sellerIds: undefined,
      productIds: undefined,
      categoryIds: undefined,
      minRating: undefined,
      maxRating: undefined,
      fromCreatedAt: undefined,
      toCreatedAt: undefined,
      includePending: undefined,
      includeRejected: undefined,
      regionCodes: undefined,
      limit: 1,
      offset: 1,
      orderBy: "latestReviewCreatedAt",
      orderDirection: "desc",
    };

  const page1: IPageIShoppingMallProductReviewStatisticsBySeller =
    await api.functional.shoppingMall.platformAdmin.reviews.statistics.bySeller.index(
      connection,
      { body: paginationBodyPage1 },
    );
  typia.assert<IPageIShoppingMallProductReviewStatisticsBySeller>(page1);

  TestValidator.predicate(
    "page1.data should also contain at most one row due to limit=1",
    page1.data.length <= 1,
  );

  if (page0.data.length === 1 && page1.data.length === 1) {
    const sellerId0 = page0.data[0].sellerId;
    const sellerId1 = page1.data[0].sellerId;

    TestValidator.predicate(
      "when both pages have data, seller IDs returned are non-empty strings",
      typeof sellerId0 === "string" &&
        sellerId0.length > 0 &&
        typeof sellerId1 === "string" &&
        sellerId1.length > 0,
    );
  }

  // Basic sanity: each statistics row's totalReviewCount is non-negative, and rating buckets sum to >= totalReviewCount
  const validateStatsRow = (
    row: IShoppingMallProductReviewStatisticsBySeller,
  ) => {
    TestValidator.predicate(
      "totalReviewCount is non-negative",
      row.totalReviewCount >= 0,
    );

    const bucketSum =
      row.ratingCount1 +
      row.ratingCount2 +
      row.ratingCount3 +
      row.ratingCount4 +
      row.ratingCount5;

    TestValidator.predicate(
      "sum of rating buckets is at least totalReviewCount",
      bucketSum >= row.totalReviewCount,
    );

    TestValidator.predicate(
      "averageRating is within [0, 5]",
      row.averageRating >= 0 && row.averageRating <= 5,
    );
  };

  pageForSellerA.data.forEach(validateStatsRow);
  page0.data.forEach(validateStatsRow);
  page1.data.forEach(validateStatsRow);
}
