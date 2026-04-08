import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test browsing product reviews on a product detail page with filtering and pagination.
 *
 * Validates the review listing endpoint's ability to filter, sort, and paginate reviews for a specific product. Tests various filter combinations including productId, rating range, text search, and pagination parameters.
 *
 * Special attention is given to verifying that reviews are sorted by newest first, pagination metadata is accurate, and various filters (rating range, text search) work correctly. The test assumes existing review data in the system.
 *
 * 1. Create a customer account for authenticated access.
 * 2. Test default review listing with productId filter, verify sorting and pagination.
 * 3. Test pagination by requesting page 2 with specific limit.
 * 4. Test rating filter by requesting only 5-star reviews.
 * 5. Test text search by searching for specific keywords in review content.
 * 6. Verify filtered results are subsets of default results.
 */
export async function test_api_review_product_page_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup for authenticated access
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // Generate a product ID for testing (assumes product exists in system)
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 2. Test default review listing with productId filter
  const defaultReviews = await api.functional.shoppingMall.reviews.index(
    customerConnection,
    {
      body: {
        productId: productId,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(defaultReviews);
  // Verify pagination metadata exists and is valid
  TestValidator.predicate(
    "pagination current page is at least 1",
    defaultReviews.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is at least 1",
    defaultReviews.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    defaultReviews.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    defaultReviews.pagination.pages >= 0,
  );
  // Verify reviews are sorted by created_at descending (newest first)
  if (defaultReviews.data.length > 1) {
    for (let i = 1; i < defaultReviews.data.length; i++) {
      TestValidator.predicate(
        `review ${i} is not newer than review ${i - 1}`,
        new Date(defaultReviews.data[i].created_at).getTime() <=
          new Date(defaultReviews.data[i - 1].created_at).getTime(),
      );
    }
  }
  // Verify customer and product information is properly joined
  for (const review of defaultReviews.data) {
    TestValidator.equals(
      "review product id matches filter",
      review.product.id,
      productId,
    );
    TestValidator.predicate(
      "customer has valid display name",
      review.customer.display_name.length > 0,
    );
    TestValidator.predicate(
      "customer has valid email",
      review.customer.email.includes("@"),
    );
  }
  // 3. Test pagination by requesting page 2 with limit
  const paginatedReviews = await api.functional.shoppingMall.reviews.index(
    customerConnection,
    {
      body: {
        productId: productId,
        page: 2,
        limit: 10,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(paginatedReviews);
  TestValidator.equals(
    "pagination current page is 2",
    paginatedReviews.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit is 10",
    paginatedReviews.pagination.limit,
    10,
  );
  // 4. Test rating filter by requesting only 5-star reviews
  const fiveStarReviews = await api.functional.shoppingMall.reviews.index(
    customerConnection,
    {
      body: {
        productId: productId,
        ratingMin: 5,
        ratingMax: 5,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(fiveStarReviews);
  // Verify all returned reviews have rating 5
  for (const review of fiveStarReviews.data) {
    TestValidator.equals("review rating is 5", review.rating, 5);
  }
  // 5. Test text search by searching for specific keywords
  const searchKeyword = "excellent";
  const searchedReviews = await api.functional.shoppingMall.reviews.index(
    customerConnection,
    {
      body: {
        productId: productId,
        search: searchKeyword,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(searchedReviews);
  // Verify all returned reviews contain the search keyword in content
  for (const review of searchedReviews.data) {
    if (review.content !== null) {
      TestValidator.predicate(
        "review content contains search keyword",
        review.content.toLowerCase().includes(searchKeyword.toLowerCase()),
      );
    }
  }
  // 6. Verify filtered results are subsets of default results
  TestValidator.predicate(
    "five star reviews count is less than or equal to default",
    fiveStarReviews.pagination.records <= defaultReviews.pagination.records,
  );
  TestValidator.predicate(
    "searched reviews count is less than or equal to default",
    searchedReviews.pagination.records <= defaultReviews.pagination.records,
  );
  TestValidator.predicate(
    "paginated reviews count is less than or equal to default",
    paginatedReviews.pagination.records <= defaultReviews.pagination.records,
  );
}
