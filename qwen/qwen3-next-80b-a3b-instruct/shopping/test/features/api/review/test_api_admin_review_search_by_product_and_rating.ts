import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductReview";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_review_search_by_product_and_rating(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: "admin@example.com",
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Search for reviews with non-existent product_id and min_rating=4
  // This tests that filtering with invalid product_id returns empty array
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();
  const searchResultsWithNonExistentProduct =
    await api.functional.shoppingMall.admin.reviews.index(adminConnection, {
      body: {
        product_id: nonExistentProductId,
        min_rating: 4,
      } satisfies IShoppingMallProductReview.IRequest,
    });
  typia.assert(searchResultsWithNonExistentProduct);
  // Should return empty array since product does not exist
  TestValidator.equals(
    "no reviews found for non-existent product",
    searchResultsWithNonExistentProduct.data.length,
    0,
  );
  // Step 3: Search for reviews with min_rating=4 without product_id
  // This tests that min_rating filter works and returns reviews
  const searchResultsWithMinRating4 =
    await api.functional.shoppingMall.admin.reviews.index(adminConnection, {
      body: {
        min_rating: 4,
      } satisfies IShoppingMallProductReview.IRequest,
    });
  typia.assert(searchResultsWithMinRating4);
  // Validate pagination structure is correct
  TestValidator.equals(
    "pagination current page correct",
    searchResultsWithMinRating4.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit correct",
    searchResultsWithMinRating4.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "total records exist",
    () => searchResultsWithMinRating4.pagination.records > 0,
  );
  TestValidator.predicate(
    "total pages exist",
    () => searchResultsWithMinRating4.pagination.pages > 0,
  );
  // Verify that we have at least one review
  TestValidator.predicate(
    "at least one review exists for min_rating=4",
    () => searchResultsWithMinRating4.data.length > 0,
  );
  // Verify that all returned reviews have rating >= 4
  for (const review of searchResultsWithMinRating4.data) {
    TestValidator.predicate("review rating >= 4", () => review.rating >= 4);
  }
  // Verify results are sorted by createdAt in descending order
  // Compare consecutive reviews to ensure chronological order
  if (searchResultsWithMinRating4.data.length >= 2) {
    for (let i = 0; i < searchResultsWithMinRating4.data.length - 1; i++) {
      const currentReview = searchResultsWithMinRating4.data[i];
      const nextReview = searchResultsWithMinRating4.data[i + 1];
      const currentTimestamp = new Date(currentReview.createdAt).getTime();
      const nextTimestamp = new Date(nextReview.createdAt).getTime();
      // Verify current review is newer than or equal to next review (descending order)
      // We use >= to handle cases where timestamps might be equal
      TestValidator.predicate(
        `review ${i} createdAt >= review ${i + 1} createdAt (descending order)`,
        () => currentTimestamp >= nextTimestamp,
      );
    }
  }
}
