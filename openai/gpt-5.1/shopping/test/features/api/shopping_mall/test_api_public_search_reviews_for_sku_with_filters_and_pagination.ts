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

/**
 * Validate public SKU review search with rating filters and pagination.
 *
 * Business goals:
 *
 * - Ensure that PATCH /shoppingMall/products/{productId}/skus/{skuId}/reviews
 *   returns only reviews for the specified product+SKU
 * - Verify that rating-based filters (minRating) are respected
 * - Validate basic pagination metadata and that limit is applied
 * - Confirm that sorting by rating and createdAt behaves as expected
 *
 * Implementation notes and simplifications:
 *
 * - Original scenario mentions admin-created category tree, brand, product, SKU,
 *   and customer purchase history via carts and orders. However, with the
 *   currently exposed APIs and DTOs, tying reviews to completed orders is not
 *   feasible in a type-safe way (we lack address snapshot creation APIs, etc.).
 *   Therefore, this E2E focuses purely on SKU review creation and public search
 *   behavior that is implementable with the given SDK, explicitly skipping
 *   carts/orders while still exercising realistic review workflows.
 * - We still create a platform admin and a product+SKU via admin APIs so that the
 *   product context is realistic.
 * - Two different customers create reviews for the same SKU, giving us a mix of
 *   ratings to filter on.
 * - We also create another SKU and some reviews for it to ensure that search
 *   results are scoped to the requested SKU.
 */
export async function test_api_public_search_reviews_for_sku_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Platform admin join and authentication
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a product as platform admin
  //    Use typia.random for IShoppingMallProduct.ICreate to satisfy all
  //    required foreign keys (seller, optional brand) without owning those
  //    creation flows here.
  const productCreateBody = typia.random<IShoppingMallProduct.ICreate>();
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert(product);

  // 3. Create two SKUs under this product: one target SKU and one noise SKU
  const targetSkuCreateBody = {
    code: `sku-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(2),
    listPrice: 10000,
    salePrice: 8000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const targetSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: product.code,
        body: targetSkuCreateBody,
      },
    );
  typia.assert(targetSku);

  const otherSkuCreateBody = {
    code: `sku-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(2),
    listPrice: 12000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const otherSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: product.code,
        body: otherSkuCreateBody,
      },
    );
  typia.assert(otherSku);

  // 4. Register two customers who will write reviews
  const customerJoinBody1 = {
    email: `${RandomGenerator.alphabets(8)}@customer1.example.com`,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://shop.example.com/signup",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customer1: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody1,
    });
  typia.assert(customer1);

  const customerJoinBody2 = {
    email: `${RandomGenerator.alphabets(8)}@customer2.example.com`,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://shop.example.com/signup",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customer2: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody2,
    });
  typia.assert(customer2);

  // Helper to create reviews as the currently authenticated customer
  const createReviewForSku = async (
    productId: string,
    skuId: string,
    rating: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>,
    titleSuffix: string,
  ): Promise<IShoppingMallProductReview> => {
    const body = {
      rating,
      title: `Review ${titleSuffix}`,
      body: RandomGenerator.paragraph({ sentences: 5 }),
    } satisfies IShoppingMallProductReview.ICreate;

    const review: IShoppingMallProductReview =
      await api.functional.shoppingMall.customer.products.skus.reviews.create(
        connection,
        {
          productId,
          skuId,
          body,
        },
      );
    typia.assert(review);
    return review;
  };

  // 5. Create multiple reviews for the target SKU
  // Switch auth to customer1 by logging in (tokens handled by SDK)
  const customer1LoginBody = {
    email: customerJoinBody1.email,
    password: customerJoinBody1.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/landing",
    userAgent: "E2E-Test-Customer1",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customer1Login: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customer1LoginBody,
    });
  typia.assert(customer1Login);

  const review1 = await createReviewForSku(
    product.id,
    targetSku.id,
    5 as number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>,
    "A-5-star-1",
  );
  const review2 = await createReviewForSku(
    product.id,
    targetSku.id,
    3 as number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>,
    "A-3-star",
  );

  // Switch auth to customer2
  const customer2LoginBody = {
    email: customerJoinBody2.email,
    password: customerJoinBody2.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/landing",
    userAgent: "E2E-Test-Customer2",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customer2Login: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customer2LoginBody,
    });
  typia.assert(customer2Login);

  const review3 = await createReviewForSku(
    product.id,
    targetSku.id,
    5 as number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>,
    "B-5-star-2",
  );
  const review4 = await createReviewForSku(
    product.id,
    targetSku.id,
    4 as number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>,
    "B-4-star",
  );

  // Create some noise reviews for another SKU so that we can verify scoping
  const otherReview1 = await createReviewForSku(
    product.id,
    otherSku.id,
    5 as number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>,
    "Other-5-star",
  );
  void otherReview1;

  // 6. Public search: rating filter and pagination for target SKU
  const limit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = 2 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;

  const searchRequestHighRating = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
    orderBy: "rating" as const,
    orderDirection: "desc" as const,
    minRating: 4 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
  } satisfies IShoppingMallProductReview.IRequest;

  const pageHighRating: IPageIShoppingMallProductReview.ISummary =
    await api.functional.shoppingMall.products.skus.reviews.index(connection, {
      productId: product.id,
      skuId: targetSku.id,
      body: searchRequestHighRating,
    });
  typia.assert(pageHighRating);

  const { pagination: highRatingPagination, data: highRatingData } =
    pageHighRating;

  // Basic pagination structure assertions
  TestValidator.predicate(
    "high-rating pagination limit should equal requested limit",
    highRatingPagination.limit === limit,
  );
  TestValidator.predicate(
    "high-rating pagination pages should be >= 1 when there are reviews",
    highRatingPagination.pages >= 1,
  );

  // Expect at least 3 high-rated reviews (ratings 4 or 5), given our setup
  const expectedHighRatedCount = [review1, review3, review4].length;
  TestValidator.predicate(
    "records should be at least number of created high-rated reviews",
    highRatingPagination.records >= expectedHighRatedCount,
  );

  // Ensure limit is applied on data length (could be less if fewer records)
  TestValidator.predicate(
    "high-rating data length should not exceed limit",
    highRatingData.length <= limit,
  );

  // 7. Validate each returned review respects rating filter and scope
  for (const summary of highRatingData) {
    // Rating filter
    TestValidator.predicate(
      "each returned review rating must be >= minRating",
      summary.rating_value >= (searchRequestHighRating.minRating ?? 1),
    );

    // Scope: product and SKU must match target
    TestValidator.equals(
      "summary.product_id must equal target product.id",
      summary.product_id,
      product.id,
    );

    TestValidator.equals(
      "summary.sku_id must equal target sku.id",
      summary.sku_id ?? null,
      targetSku.id,
    );
  }

  // 8. Validate sorting by rating desc (non-increasing rating_value)
  for (let i = 1; i < highRatingData.length; i++) {
    const prev = highRatingData[i - 1];
    const curr = highRatingData[i];
    TestValidator.predicate(
      "ratings should be sorted in non-increasing order when orderBy=rating, desc",
      prev.rating_value >= curr.rating_value,
    );
  }

  // 9. Another search ordered by createdAt desc to validate chronological sort
  const searchRequestCreatedAt = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    orderBy: "createdAt" as const,
    orderDirection: "desc" as const,
  } satisfies IShoppingMallProductReview.IRequest;

  const pageCreatedAt: IPageIShoppingMallProductReview.ISummary =
    await api.functional.shoppingMall.products.skus.reviews.index(connection, {
      productId: product.id,
      skuId: targetSku.id,
      body: searchRequestCreatedAt,
    });
  typia.assert(pageCreatedAt);

  const createdAtData = pageCreatedAt.data;
  for (let i = 1; i < createdAtData.length; i++) {
    const prev = createdAtData[i - 1];
    const curr = createdAtData[i];
    TestValidator.predicate(
      "created_at should be non-increasing when orderBy=createdAt, desc",
      prev.created_at >= curr.created_at,
    );
  }

  // 10. Ensure that reviews for other SKU are not present in target SKU search
  const otherSkuSearchRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IShoppingMallProductReview.IRequest;

  const pageForTargetAfterOther: IPageIShoppingMallProductReview.ISummary =
    await api.functional.shoppingMall.products.skus.reviews.index(connection, {
      productId: product.id,
      skuId: targetSku.id,
      body: otherSkuSearchRequest,
    });
  typia.assert(pageForTargetAfterOther);

  for (const summary of pageForTargetAfterOther.data) {
    TestValidator.equals(
      "target search should not include reviews from other sku",
      summary.sku_id ?? null,
      targetSku.id,
    );
  }
}
