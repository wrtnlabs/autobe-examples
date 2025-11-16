import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that the review filtering endpoint handles empty result sets gracefully.
 *
 * This test validates the system's behavior when applying filters that
 * intentionally match no reviews. It ensures the API returns proper empty
 * result structures with correct pagination metadata (zero records, zero pages)
 * without throwing errors.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a new buyer account
 * 2. Apply impossible filter combinations that guarantee no matches
 * 3. Validate empty response structure with correct pagination metadata
 * 4. Test multiple filter scenarios for consistent empty result handling
 */
export async function test_api_buyer_reviews_empty_result_set(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new buyer account
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, { body: buyerData });
  typia.assert(buyer);

  // Step 2: Test empty result with impossible date range (start_date after end_date)
  const impossibleDateRangeRequest = {
    page: 1,
    limit: 20,
    start_date: new Date("2099-12-31T23:59:59Z").toISOString(),
    end_date: new Date("2099-01-01T00:00:00Z").toISOString(),
  } satisfies IShoppingMallReview.IRequest;

  const emptyResult1: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: impossibleDateRangeRequest,
    });
  typia.assert(emptyResult1);

  TestValidator.equals(
    "empty result has zero records",
    emptyResult1.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has zero pages",
    emptyResult1.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result current page is 1",
    emptyResult1.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty result data array is empty",
    emptyResult1.data.length,
    0,
  );

  // Step 3: Test empty result with non-existent sale_id
  const nonExistentSaleRequest = {
    page: 1,
    limit: 20,
    sale_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IShoppingMallReview.IRequest;

  const emptyResult2: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: nonExistentSaleRequest,
    });
  typia.assert(emptyResult2);

  TestValidator.equals(
    "non-existent sale returns zero records",
    emptyResult2.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent sale returns zero pages",
    emptyResult2.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "non-existent sale returns empty data array",
    emptyResult2.data.length === 0,
  );

  // Step 4: Test empty result with impossible rating range (min > max)
  const impossibleRatingRequest = {
    page: 1,
    limit: 20,
    min_rating: 5 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    max_rating: 1 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
  } satisfies IShoppingMallReview.IRequest;

  const emptyResult3: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: impossibleRatingRequest,
    });
  typia.assert(emptyResult3);

  TestValidator.equals(
    "impossible rating range returns zero records",
    emptyResult3.pagination.records,
    0,
  );
  TestValidator.equals(
    "impossible rating range returns zero pages",
    emptyResult3.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "impossible rating range returns empty data",
    emptyResult3.data.length === 0,
  );

  // Step 5: Test empty result with non-existent search text
  const impossibleSearchRequest = {
    page: 1,
    limit: 20,
    search_text: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IShoppingMallReview.IRequest;

  const emptyResult4: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: impossibleSearchRequest,
    });
  typia.assert(emptyResult4);

  TestValidator.equals(
    "impossible search returns zero records",
    emptyResult4.pagination.records,
    0,
  );
  TestValidator.predicate(
    "impossible search returns valid pagination",
    emptyResult4.pagination.pages === 0 &&
      emptyResult4.pagination.current === 1,
  );
  TestValidator.predicate(
    "impossible search returns empty array",
    emptyResult4.data.length === 0,
  );

  // Step 6: Test empty result with combined impossible filters
  const combinedImpossibleRequest = {
    page: 1,
    limit: 20,
    sale_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    sku_id: typia.random<string & tags.Format<"uuid">>(),
    min_rating: 5 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    max_rating: 1 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    start_date: new Date("2099-12-31T23:59:59Z").toISOString(),
    end_date: new Date("2099-01-01T00:00:00Z").toISOString(),
  } satisfies IShoppingMallReview.IRequest;

  const emptyResult5: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: combinedImpossibleRequest,
    });
  typia.assert(emptyResult5);

  TestValidator.equals(
    "combined impossible filters return zero records",
    emptyResult5.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined impossible filters return zero pages",
    emptyResult5.pagination.pages,
    0,
  );
  TestValidator.equals(
    "combined impossible filters current page is 1",
    emptyResult5.pagination.current,
    1,
  );
  TestValidator.predicate(
    "combined impossible filters return empty data",
    emptyResult5.data.length === 0,
  );
}
