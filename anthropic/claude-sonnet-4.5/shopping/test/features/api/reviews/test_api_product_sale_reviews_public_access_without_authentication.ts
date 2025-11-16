import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate public access to product reviews without authentication.
 *
 * This test ensures that the review retrieval API is publicly accessible
 * without requiring authentication tokens, supporting transparent buyer
 * research. Since order creation and review approval APIs are not available in
 * the provided materials, this test focuses on validating the public
 * accessibility of the review endpoint with various filtering and pagination
 * parameters.
 *
 * Test workflow:
 *
 * 1. Create admin account for category management
 * 2. Create product category for organization
 * 3. Create seller account and product listing
 * 4. Test public review retrieval WITHOUT authentication
 * 5. Validate pagination and filtering work for anonymous users
 * 6. Test various filter combinations (rating, verification, sorting)
 */
export async function test_api_product_sale_reviews_public_access_without_authentication(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "moderator",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.paragraph({ sentences: 10 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Create product sale
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        condition: "new",
        return_policy_days: 30,
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Test public review retrieval WITHOUT authentication
  const unauthConn = { ...connection, headers: {} };

  const publicReviews = await api.functional.shoppingMall.sales.reviews.index(
    unauthConn,
    {
      saleId: sale.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(publicReviews);

  // Step 6: Validate pagination structure
  TestValidator.predicate(
    "current page should be 1",
    publicReviews.pagination.current === 1,
  );
  TestValidator.predicate(
    "page limit should be 20",
    publicReviews.pagination.limit === 20,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    publicReviews.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    publicReviews.pagination.pages >= 0,
  );

  // Step 7: Test filtering by minimum rating
  const highRatingReviews =
    await api.functional.shoppingMall.sales.reviews.index(unauthConn, {
      saleId: sale.id,
      body: {
        page: 1,
        limit: 20,
        min_rating: 4,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(highRatingReviews);

  // Step 8: Test filtering by verified purchase only
  const verifiedReviews = await api.functional.shoppingMall.sales.reviews.index(
    unauthConn,
    {
      saleId: sale.id,
      body: {
        page: 1,
        limit: 10,
        verified_purchase_only: true,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(verifiedReviews);

  // Step 9: Test sorting by helpfulness
  const helpfulReviews = await api.functional.shoppingMall.sales.reviews.index(
    unauthConn,
    {
      saleId: sale.id,
      body: {
        page: 1,
        limit: 20,
        sort_by: "helpfulness",
        sort_order: "desc",
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(helpfulReviews);

  // Step 10: Test date range filtering
  const dateFilteredReviews =
    await api.functional.shoppingMall.sales.reviews.index(unauthConn, {
      saleId: sale.id,
      body: {
        page: 1,
        limit: 20,
        start_date: new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        end_date: new Date().toISOString(),
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(dateFilteredReviews);

  // Step 11: Test text search functionality
  const searchReviews = await api.functional.shoppingMall.sales.reviews.index(
    unauthConn,
    {
      saleId: sale.id,
      body: {
        page: 1,
        limit: 20,
        search_text: "product",
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(searchReviews);

  // Step 12: Validate that all API calls succeeded without authentication
  TestValidator.predicate(
    "public review retrieval should succeed",
    publicReviews.pagination.current === 1,
  );
  TestValidator.predicate(
    "filtered reviews should succeed",
    highRatingReviews.pagination.current === 1,
  );
  TestValidator.predicate(
    "verified purchase filter should succeed",
    verifiedReviews.pagination.current === 1,
  );
  TestValidator.predicate(
    "sorted reviews should succeed",
    helpfulReviews.pagination.current === 1,
  );
  TestValidator.predicate(
    "date filtered reviews should succeed",
    dateFilteredReviews.pagination.current === 1,
  );
  TestValidator.predicate(
    "search reviews should succeed",
    searchReviews.pagination.current === 1,
  );
}
