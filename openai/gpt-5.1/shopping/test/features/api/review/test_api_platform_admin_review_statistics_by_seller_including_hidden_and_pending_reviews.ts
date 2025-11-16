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

export async function test_api_platform_admin_review_statistics_by_seller_including_hidden_and_pending_reviews(
  connection: api.IConnection,
) {
  // 1. Seller joins and becomes authenticated
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "seller-password-1234",
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  const sellerId = sellerAuthorized.id;

  // 2. Seller creates a product
  const productCode: string = RandomGenerator.alphaNumeric(12);
  const productCreateBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: undefined,
    code: productCode as string & tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 3. Seller creates a SKU under the product
  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody,
    });
  typia.assert<IShoppingMallProductSku>(sku);

  // 4. Customer joins and logs in
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "customer-password-1234",
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://customer.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // For realism, perform an explicit login as the same customer
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://customer.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://customer.example.com/landing" as string &
      tags.Format<"uri">,
    userAgent: "E2E-Test-Agent/1.0",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerAuthorizedLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorizedLoggedIn);

  // 5. Customer creates multiple reviews for the product
  const ratings: (number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5>)[] = [5, 4, 3];

  const createdReviews: IShoppingMallProductReview[] = [];

  for (const rating of ratings) {
    const reviewBody = {
      rating,
      title: RandomGenerator.paragraph({ sentences: 1 }),
      body: RandomGenerator.paragraph({ sentences: 4 }),
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
    createdReviews.push(review);
  }

  TestValidator.predicate(
    "at least one review should have been created",
    createdReviews.length >= 1,
  );

  // 6. Platform admin joins and logs in
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: "platform-admin-password-1234",
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminAuthorized);

  // explicit login as admin
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminAuthorizedLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminAuthorizedLoggedIn);

  // 7. Call statistics.bySeller without pending/rejected
  const exclusiveRequestBody = {
    sellerIds: [sellerId],
    productIds: undefined,
    categoryIds: undefined,
    minRating: undefined,
    maxRating: undefined,
    fromCreatedAt: undefined,
    toCreatedAt: undefined,
    includePending: false,
    includeRejected: false,
    regionCodes: undefined,
    orderBy: "sellerId",
    orderDirection: "asc",
  } satisfies IShoppingMallProductReviewStatisticsBySeller.IRequest;

  const exclusivePage: IPageIShoppingMallProductReviewStatisticsBySeller =
    await api.functional.shoppingMall.platformAdmin.reviews.statistics.bySeller.index(
      connection,
      {
        body: exclusiveRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallProductReviewStatisticsBySeller>(
    exclusivePage,
  );

  const exclusiveStatsForSeller = exclusivePage.data.find(
    (row) => row.sellerId === sellerId,
  );

  TestValidator.predicate(
    "exclusive stats must contain an entry for the seller",
    exclusiveStatsForSeller !== undefined,
  );

  if (!exclusiveStatsForSeller) return;

  typia.assert<IShoppingMallProductReviewStatisticsBySeller>(
    exclusiveStatsForSeller,
  );

  // 8. Call statistics.bySeller including pending/rejected
  const inclusiveRequestBody = {
    sellerIds: [sellerId],
    productIds: undefined,
    categoryIds: undefined,
    minRating: undefined,
    maxRating: undefined,
    fromCreatedAt: undefined,
    toCreatedAt: undefined,
    includePending: true,
    includeRejected: true,
    regionCodes: undefined,
    orderBy: "sellerId",
    orderDirection: "asc",
  } satisfies IShoppingMallProductReviewStatisticsBySeller.IRequest;

  const inclusivePage: IPageIShoppingMallProductReviewStatisticsBySeller =
    await api.functional.shoppingMall.platformAdmin.reviews.statistics.bySeller.index(
      connection,
      {
        body: inclusiveRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallProductReviewStatisticsBySeller>(
    inclusivePage,
  );

  const inclusiveStatsForSeller = inclusivePage.data.find(
    (row) => row.sellerId === sellerId,
  );

  TestValidator.predicate(
    "inclusive stats must also contain an entry for the seller",
    inclusiveStatsForSeller !== undefined,
  );

  if (!inclusiveStatsForSeller) return;

  typia.assert<IShoppingMallProductReviewStatisticsBySeller>(
    inclusiveStatsForSeller,
  );

  // 9. Assert invariants between exclusive and inclusive stats
  TestValidator.equals(
    "sellerId should match between exclusive and inclusive stats",
    inclusiveStatsForSeller.sellerId,
    exclusiveStatsForSeller.sellerId,
  );

  TestValidator.predicate(
    "inclusive totalReviewCount must be >= exclusive totalReviewCount",
    inclusiveStatsForSeller.totalReviewCount >=
      exclusiveStatsForSeller.totalReviewCount,
  );

  TestValidator.predicate(
    "ratingCount1 inclusive >= exclusive",
    inclusiveStatsForSeller.ratingCount1 >=
      exclusiveStatsForSeller.ratingCount1,
  );

  TestValidator.predicate(
    "ratingCount2 inclusive >= exclusive",
    inclusiveStatsForSeller.ratingCount2 >=
      exclusiveStatsForSeller.ratingCount2,
  );

  TestValidator.predicate(
    "ratingCount3 inclusive >= exclusive",
    inclusiveStatsForSeller.ratingCount3 >=
      exclusiveStatsForSeller.ratingCount3,
  );

  TestValidator.predicate(
    "ratingCount4 inclusive >= exclusive",
    inclusiveStatsForSeller.ratingCount4 >=
      exclusiveStatsForSeller.ratingCount4,
  );

  TestValidator.predicate(
    "ratingCount5 inclusive >= exclusive",
    inclusiveStatsForSeller.ratingCount5 >=
      exclusiveStatsForSeller.ratingCount5,
  );

  if (
    inclusiveStatsForSeller.totalReviewCount ===
    exclusiveStatsForSeller.totalReviewCount
  ) {
    TestValidator.equals(
      "when totalReviewCount is equal, averageRating should be equal",
      inclusiveStatsForSeller.averageRating,
      exclusiveStatsForSeller.averageRating,
    );
  }
}
