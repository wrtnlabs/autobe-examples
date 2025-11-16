import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSeller";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller review retrieval endpoint with filtering and pagination
 * parameters.
 *
 * This test validates the review retrieval endpoint's parameter handling,
 * response structure, and filtering capabilities. Due to API limitations
 * (missing cart, SKU, category, address, and payment method creation
 * endpoints), this test focuses on endpoint parameter validation and response
 * structure correctness rather than end-to-end workflow testing.
 *
 * Test workflow:
 *
 * 1. Register seller account to obtain authentication and seller ID
 * 2. Call review retrieval endpoint with various filter combinations
 * 3. Validate response structure matches IPageIShoppingMallReview.ISummary
 * 4. Test pagination parameters (page, limit)
 * 5. Test rating filters (min_rating, max_rating)
 * 6. Test boolean filters (verified_purchase_only, has_images)
 * 7. Test sorting parameters (sort_by, sort_order)
 * 8. Validate parameter combinations work without errors
 */
export async function test_api_seller_reviews_retrieval_with_filtering(
  connection: api.IConnection,
) {
  // 1. Register seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile("+82"),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 10 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // 2. Test basic pagination - page 1 with limit 10
  const page1 = await api.functional.shoppingMall.seller.sellers.reviews.index(
    connection,
    {
      sellerId: seller.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.predicate(
    "response has pagination metadata",
    page1.pagination !== null && page1.pagination !== undefined,
  );
  TestValidator.predicate("response has data array", Array.isArray(page1.data));

  // 3. Test page 2 navigation
  const page2 = await api.functional.shoppingMall.seller.sellers.reviews.index(
    connection,
    {
      sellerId: seller.id,
      body: {
        page: 2,
        limit: 10,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(page2);

  // 4. Test high rating filter (4-5 stars)
  const highRatedReviews =
    await api.functional.shoppingMall.seller.sellers.reviews.index(connection, {
      sellerId: seller.id,
      body: {
        page: 1,
        limit: 20,
        min_rating: 4,
        max_rating: 5,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(highRatedReviews);
  TestValidator.predicate(
    "high rating filter returns valid response",
    Array.isArray(highRatedReviews.data),
  );

  // 5. Test low rating filter (1-2 stars)
  const lowRatedReviews =
    await api.functional.shoppingMall.seller.sellers.reviews.index(connection, {
      sellerId: seller.id,
      body: {
        page: 1,
        limit: 20,
        min_rating: 1,
        max_rating: 2,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(lowRatedReviews);

  // 6. Test verified purchase filter
  const verifiedOnly =
    await api.functional.shoppingMall.seller.sellers.reviews.index(connection, {
      sellerId: seller.id,
      body: {
        page: 1,
        limit: 20,
        verified_purchase_only: true,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(verifiedOnly);

  // 7. Test has_images filter
  const withImages =
    await api.functional.shoppingMall.seller.sellers.reviews.index(connection, {
      sellerId: seller.id,
      body: {
        page: 1,
        limit: 20,
        has_images: true,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(withImages);

  // 8. Test date range filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateFiltered =
    await api.functional.shoppingMall.seller.sellers.reviews.index(connection, {
      sellerId: seller.id,
      body: {
        page: 1,
        limit: 20,
        start_date: thirtyDaysAgo.toISOString(),
        end_date: now.toISOString(),
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(dateFiltered);

  // 9. Test sorting by rating descending
  const sortedRatingDesc =
    await api.functional.shoppingMall.seller.sellers.reviews.index(connection, {
      sellerId: seller.id,
      body: {
        page: 1,
        limit: 20,
        sort_by: "rating",
        sort_order: "desc",
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(sortedRatingDesc);

  // 10. Test sorting by created_at ascending
  const sortedDateAsc =
    await api.functional.shoppingMall.seller.sellers.reviews.index(connection, {
      sellerId: seller.id,
      body: {
        page: 1,
        limit: 20,
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(sortedDateAsc);

  // 11. Test sorting by helpfulness descending
  const sortedHelpfulness =
    await api.functional.shoppingMall.seller.sellers.reviews.index(connection, {
      sellerId: seller.id,
      body: {
        page: 1,
        limit: 20,
        sort_by: "helpfulness",
        sort_order: "desc",
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(sortedHelpfulness);

  // 12. Test combined filters with sorting
  const complexQuery =
    await api.functional.shoppingMall.seller.sellers.reviews.index(connection, {
      sellerId: seller.id,
      body: {
        page: 1,
        limit: 15,
        min_rating: 3,
        max_rating: 5,
        verified_purchase_only: true,
        has_images: true,
        sort_by: "rating",
        sort_order: "desc",
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(complexQuery);

  // 13. Test status filter with approved reviews
  const approvedReviews =
    await api.functional.shoppingMall.seller.sellers.reviews.index(connection, {
      sellerId: seller.id,
      body: {
        page: 1,
        limit: 20,
        status: "approved",
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(approvedReviews);

  // 14. Validate pagination consistency
  TestValidator.predicate(
    "pagination current page matches request",
    page1.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    page1.pagination.limit === 3,
  );
}
