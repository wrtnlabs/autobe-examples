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

export async function test_api_seller_review_statistics_role_isolation(
  connection: api.IConnection,
) {
  // 0. Helper to generate common URLs
  const href = "https://test.shoppingmall.local/join" as const;
  const referrer = "https://test.shoppingmall.local/" as const;

  // 1. Platform admin join & login (for category tree, brand, and SKU creation if needed)
  const platformAdminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    name: RandomGenerator.name(),
    password: "AdminPass123!",
    ip: "127.0.0.1",
    href,
    referrer,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // Re-login as platformAdmin just to exercise login path (not strictly required)
  const platformAdminLoginBody = {
    email: platformAdmin.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href,
    referrer,
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLogged: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogged);

  // 2. Create a category tree (not directly used by APIs here, but aligns with dependencies)
  const categoryTreeCreateBody = {
    code: `CT-${RandomGenerator.alphaNumeric(8)}`,
    name: "Default Category Tree",
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

  // 3. Create a brand for products
  const brandCreateBody = {
    name: `Brand-${RandomGenerator.alphabets(6)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.test.local/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4. Register Seller A and Seller B
  const sellerJoinBase = {
    password: "SellerPass123!",
    storeName: `Store-${RandomGenerator.alphabets(6)}`,
    contactPhone: RandomGenerator.mobile(),
  } as const;

  const sellerAJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.test.com`,
    password: sellerJoinBase.password,
    storeName: `${sellerJoinBase.storeName}-A`,
    contactPhone: sellerJoinBase.contactPhone,
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert(sellerAAuth);

  const sellerBJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.test.com`,
    password: sellerJoinBase.password,
    storeName: `${sellerJoinBase.storeName}-B`,
    contactPhone: sellerJoinBase.contactPhone,
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerBAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert(sellerBAuth);

  // 5. Log in as Seller A to create product A
  const sellerALoginBody = {
    email: sellerAJoinBody.email,
    password: sellerAJoinBody.password,
    ip: "127.0.0.1",
    href,
    referrer,
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerALogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBody,
    });
  typia.assert(sellerALogin);

  const productACode = `PROD-A-${RandomGenerator.alphaNumeric(6)}` as const;

  const productACreateBody = {
    shopping_mall_seller_id: sellerALogin.id,
    shopping_mall_brand_id: brand.id,
    code: productACode,
    name: "Seller A Product",
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.test.local/product-a.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productACreateBody,
    });
  typia.assert(productA);

  // 6. Log in as Seller B to create product B
  const sellerBLoginBody = {
    email: sellerBJoinBody.email,
    password: sellerBJoinBody.password,
    ip: "127.0.0.1",
    href,
    referrer,
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerBLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerBLoginBody,
    });
  typia.assert(sellerBLogin);

  const productBCode = `PROD-B-${RandomGenerator.alphaNumeric(6)}` as const;

  const productBCreateBody = {
    shopping_mall_seller_id: sellerBLogin.id,
    shopping_mall_brand_id: brand.id,
    code: productBCode,
    name: "Seller B Product",
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.test.local/product-b.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBCreateBody,
    });
  typia.assert(productB);

  // 7. As platform admin, create SKUs for product A and B (using productCode)
  const skuACreateBody = {
    code: `SKU-A-${RandomGenerator.alphaNumeric(6)}`,
    name: "Seller A SKU",
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuA: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: productA.code,
        body: skuACreateBody,
      },
    );
  typia.assert(skuA);

  const skuBCreateBody = {
    code: `SKU-B-${RandomGenerator.alphaNumeric(6)}`,
    name: "Seller B SKU",
    listPrice: 20000,
    salePrice: 18000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuB: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: productB.code,
        body: skuBCreateBody,
      },
    );
  typia.assert(skuB);

  // 8. Register and log in as a customer
  const customerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@customer.test.com`,
    password: "CustomerPass123!",
    name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href,
    referrer,
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: "127.0.0.1",
    href,
    referrer,
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLogged: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogged);

  // Helper to create a cart, add one SKU item, and then an order
  const createOrderForSku = async (
    skuSummary: IShoppingMallProductSku,
  ): Promise<IShoppingMallOrder> => {
    const cartCreateBody = {
      currency_code: skuSummary.currency,
      region_code: "KR-Seoul",
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
      skuId: skuSummary.id,
      quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      note: "Test item",
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

    // Build monetary snapshot from cart totals for order creation
    const orderCreateBody = {
      customer_cart_id: cart.id,
      currency_code: cart.currency_code,
      items_subtotal_amount: cart.subtotal_amount,
      discount_total_amount: cart.discount_amount,
      shipping_total_amount: cart.shipping_amount,
      tax_total_amount: cart.tax_amount,
      grand_total_amount: cart.total_amount,
      shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
      billing_address_id: typia.random<string & tags.Format<"uuid">>(),
      customer_note: "Please deliver quickly.",
    } satisfies IShoppingMallOrder.ICreate;

    const order: IShoppingMallOrder =
      await api.functional.shoppingMall.customer.orders.create(connection, {
        body: orderCreateBody,
      });
    typia.assert(order);
    return order;
  };

  // 9. Create order and reviews for Seller A
  const orderA: IShoppingMallOrder = await createOrderForSku(skuA);
  typia.assert(orderA);

  const productAReviewBody: IShoppingMallProductReview.ICreate = {
    rating: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Great product!" as string & tags.MinLength<1> & tags.MaxLength<255>,
    body: "Very satisfied with Seller A product." as string & tags.MinLength<1>,
  };

  const productAReview: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: productA.id,
        body: productAReviewBody,
      },
    );
  typia.assert(productAReview);

  const skuAReviewBody: IShoppingMallProductReview.ICreate = {
    rating: 4 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Good SKU variant" as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    body: "SKU-specific review for Seller A." as string & tags.MinLength<1>,
  };

  const skuAReview: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.skus.reviews.create(
      connection,
      {
        productId: productA.id,
        skuId: skuA.id,
        body: skuAReviewBody,
      },
    );
  typia.assert(skuAReview);

  // 10. Create order and reviews for Seller B
  const orderB: IShoppingMallOrder = await createOrderForSku(skuB);
  typia.assert(orderB);

  const productBReviewBody: IShoppingMallProductReview.ICreate = {
    rating: 2 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Not great" as string & tags.MinLength<1> & tags.MaxLength<255>,
    body: "Somewhat disappointed with Seller B product." as string &
      tags.MinLength<1>,
  };

  const productBReview: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: productB.id,
        body: productBReviewBody,
      },
    );
  typia.assert(productBReview);

  const skuBReviewBody: IShoppingMallProductReview.ICreate = {
    rating: 3 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "OK variant" as string & tags.MinLength<1> & tags.MaxLength<255>,
    body: "SKU-specific review for Seller B." as string & tags.MinLength<1>,
  };

  const skuBReview: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.skus.reviews.create(
      connection,
      {
        productId: productB.id,
        skuId: skuB.id,
        body: skuBReviewBody,
      },
    );
  typia.assert(skuBReview);

  // 11. Log back in as Seller A and fetch statistics scoped to Seller A only
  const sellerALoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBody,
    });
  typia.assert(sellerALoginAgain);

  const sellerAStatsRequestBody = {
    sellerIds: [sellerALoginAgain.id],
    limit: 10 as number & tags.Type<"int32">,
    offset: 0 as number & tags.Type<"int32">,
    orderBy: "sellerId",
    orderDirection: "asc",
  } satisfies IShoppingMallProductReviewStatisticsBySeller.IRequest;

  const sellerAStatsPage: IPageIShoppingMallProductReviewStatisticsBySeller =
    await api.functional.shoppingMall.seller.reviews.statistics.bySeller.index(
      connection,
      {
        body: sellerAStatsRequestBody,
      },
    );
  typia.assert(sellerAStatsPage);

  TestValidator.predicate(
    "seller A statistics page should have at least one record",
    sellerAStatsPage.pagination.records >= 1 &&
      sellerAStatsPage.data.length >= 1,
  );

  const sellerAStatsRows = sellerAStatsPage.data.filter(
    (row) => row.sellerId === sellerALoginAgain.id,
  );

  TestValidator.predicate(
    "seller A statistics response must contain row for seller A only",
    sellerAStatsRows.length >= 1 &&
      sellerAStatsPage.data.every(
        (row) => row.sellerId === sellerALoginAgain.id,
      ),
  );

  const sellerAStats: IShoppingMallProductReviewStatisticsBySeller =
    sellerAStatsRows[0];

  TestValidator.equals(
    "seller A totalReviewCount should be 2",
    sellerAStats.totalReviewCount,
    2,
  );

  const sellerAExpectedRatingCounts = {
    ratingCount1: 0,
    ratingCount2: 0,
    ratingCount3: 0,
    ratingCount4: 1,
    ratingCount5: 1,
  } as const;

  TestValidator.equals(
    "seller A ratingCount1 matches expected",
    sellerAStats.ratingCount1,
    sellerAExpectedRatingCounts.ratingCount1,
  );
  TestValidator.equals(
    "seller A ratingCount2 matches expected",
    sellerAStats.ratingCount2,
    sellerAExpectedRatingCounts.ratingCount2,
  );
  TestValidator.equals(
    "seller A ratingCount3 matches expected",
    sellerAStats.ratingCount3,
    sellerAExpectedRatingCounts.ratingCount3,
  );
  TestValidator.equals(
    "seller A ratingCount4 matches expected",
    sellerAStats.ratingCount4,
    sellerAExpectedRatingCounts.ratingCount4,
  );
  TestValidator.equals(
    "seller A ratingCount5 matches expected",
    sellerAStats.ratingCount5,
    sellerAExpectedRatingCounts.ratingCount5,
  );

  TestValidator.predicate(
    "seller A averageRating between 0 and 5",
    sellerAStats.averageRating >= 0 && sellerAStats.averageRating <= 5,
  );

  // 12. Log in as Seller B and fetch statistics scoped to Seller B only
  const sellerBLoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerBLoginBody,
    });
  typia.assert(sellerBLoginAgain);

  const sellerBStatsRequestBody = {
    sellerIds: [sellerBLoginAgain.id],
    limit: 10 as number & tags.Type<"int32">,
    offset: 0 as number & tags.Type<"int32">,
    orderBy: "sellerId",
    orderDirection: "asc",
  } satisfies IShoppingMallProductReviewStatisticsBySeller.IRequest;

  const sellerBStatsPage: IPageIShoppingMallProductReviewStatisticsBySeller =
    await api.functional.shoppingMall.seller.reviews.statistics.bySeller.index(
      connection,
      {
        body: sellerBStatsRequestBody,
      },
    );
  typia.assert(sellerBStatsPage);

  TestValidator.predicate(
    "seller B statistics page should have at least one record",
    sellerBStatsPage.pagination.records >= 1 &&
      sellerBStatsPage.data.length >= 1,
  );

  const sellerBStatsRows = sellerBStatsPage.data.filter(
    (row) => row.sellerId === sellerBLoginAgain.id,
  );

  TestValidator.predicate(
    "seller B statistics response must contain row for seller B only",
    sellerBStatsRows.length >= 1 &&
      sellerBStatsPage.data.every(
        (row) => row.sellerId === sellerBLoginAgain.id,
      ),
  );

  const sellerBStats: IShoppingMallProductReviewStatisticsBySeller =
    sellerBStatsRows[0];

  TestValidator.equals(
    "seller B totalReviewCount should be 2",
    sellerBStats.totalReviewCount,
    2,
  );

  const sellerBExpectedRatingCounts = {
    ratingCount1: 0,
    ratingCount2: 1,
    ratingCount3: 1,
    ratingCount4: 0,
    ratingCount5: 0,
  } as const;

  TestValidator.equals(
    "seller B ratingCount1 matches expected",
    sellerBStats.ratingCount1,
    sellerBExpectedRatingCounts.ratingCount1,
  );
  TestValidator.equals(
    "seller B ratingCount2 matches expected",
    sellerBStats.ratingCount2,
    sellerBExpectedRatingCounts.ratingCount2,
  );
  TestValidator.equals(
    "seller B ratingCount3 matches expected",
    sellerBStats.ratingCount3,
    sellerBExpectedRatingCounts.ratingCount3,
  );
  TestValidator.equals(
    "seller B ratingCount4 matches expected",
    sellerBStats.ratingCount4,
    sellerBExpectedRatingCounts.ratingCount4,
  );
  TestValidator.equals(
    "seller B ratingCount5 matches expected",
    sellerBStats.ratingCount5,
    sellerBExpectedRatingCounts.ratingCount5,
  );

  TestValidator.predicate(
    "seller B averageRating between 0 and 5",
    sellerBStats.averageRating >= 0 && sellerBStats.averageRating <= 5,
  );

  // 13. Optional mixed sellerIds request under Seller A session to ensure isolation
  const sellerAAfterBLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBody,
    });
  typia.assert(sellerAAfterBLogin);

  const mixedSellerIdsRequestBody = {
    sellerIds: [sellerAAfterBLogin.id, sellerBLoginAgain.id],
    limit: 10 as number & tags.Type<"int32">,
    offset: 0 as number & tags.Type<"int32">,
    orderBy: "sellerId",
    orderDirection: "asc",
  } satisfies IShoppingMallProductReviewStatisticsBySeller.IRequest;

  const mixedStatsPage: IPageIShoppingMallProductReviewStatisticsBySeller =
    await api.functional.shoppingMall.seller.reviews.statistics.bySeller.index(
      connection,
      {
        body: mixedSellerIdsRequestBody,
      },
    );
  typia.assert(mixedStatsPage);

  TestValidator.predicate(
    "mixed sellerIds response should not expose seller B data to seller A",
    mixedStatsPage.data.length >= 1 &&
      mixedStatsPage.data.every(
        (row) => row.sellerId === sellerAAfterBLogin.id,
      ),
  );
}
