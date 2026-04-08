import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_review_listing_empty_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Create a new connection with the auth token for authenticated requests
  const memberAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // Step 2: Get member's own reviews to establish baseline
  const memberOwnReviews = await api.functional.ecommerceMall.reviews.index(
    memberAuthConnection,
    {
      body: {
        customer_id: memberAuth.id,
        page: 1,
        page_size: 10,
      },
    },
  );
  typia.assert(memberOwnReviews);
  // Extract product IDs that member has reviewed
  const reviewedProductIds = memberOwnReviews.data.map(
    (review) => review.product.id,
  );
  // Step 3: Test empty pagination with various filter combinations
  // Test 3.1: Filter by product_id that member has not reviewed
  const nonReviewedProductId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const emptyProductFilterResult =
    await api.functional.ecommerceMall.reviews.index(memberAuthConnection, {
      body: {
        customer_id: memberAuth.id,
        product_id: nonReviewedProductId,
        page: 1,
        page_size: 10,
      },
    });
  typia.assert(emptyProductFilterResult);
  // Verify empty product filter results
  TestValidator.equals(
    "product filter empty data array",
    emptyProductFilterResult.data,
    [],
  );
  TestValidator.equals(
    "product filter pagination current",
    emptyProductFilterResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "product filter pagination limit",
    emptyProductFilterResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "product filter pagination records",
    emptyProductFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "product filter pagination pages",
    emptyProductFilterResult.pagination.pages,
    0,
  );
  // Test 3.2: Filter by exact rating
  const testRating: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5> = 5;
  const emptyRatingFilterResult =
    await api.functional.ecommerceMall.reviews.index(memberAuthConnection, {
      body: {
        customer_id: memberAuth.id,
        rating: testRating,
        page: 1,
        page_size: 10,
      },
    });
  typia.assert(emptyRatingFilterResult);
  TestValidator.equals(
    "rating filter empty data array",
    emptyRatingFilterResult.data,
    [],
  );
  TestValidator.equals(
    "rating filter pagination records",
    emptyRatingFilterResult.pagination.records,
    0,
  );
  // Test 3.3: Filter by impossible date range (no reviews)
  const oldDate = new Date("2020-01-01T00:00:00Z").toISOString();
  const recentDate = new Date().toISOString();
  const emptyDateFilterResult =
    await api.functional.ecommerceMall.reviews.index(memberAuthConnection, {
      body: {
        customer_id: memberAuth.id,
        created_after: recentDate,
        created_before: oldDate, // Impossible date range
        page: 1,
        page_size: 10,
      },
    });
  typia.assert(emptyDateFilterResult);
  TestValidator.equals(
    "date filter empty data array",
    emptyDateFilterResult.data,
    [],
  );
  TestValidator.equals(
    "date filter pagination records",
    emptyDateFilterResult.pagination.records,
    0,
  );
  // Test 3.4: Combination of filters resulting in zero matches
  const emptyComboFilterResult =
    await api.functional.ecommerceMall.reviews.index(memberAuthConnection, {
      body: {
        customer_id: memberAuth.id,
        product_id: nonReviewedProductId,
        rating: testRating,
        page: 1,
        page_size: 10,
      },
    });
  typia.assert(emptyComboFilterResult);
  TestValidator.equals(
    "combo filter empty data array",
    emptyComboFilterResult.data,
    [],
  );
  TestValidator.equals(
    "combo filter pagination records",
    emptyComboFilterResult.pagination.records,
    0,
  );
  // Step 4: Test pagination metadata edge cases
  // Test 4.1: Requesting page beyond available pages (page 10 when only 0 records)
  const highPageResult = await api.functional.ecommerceMall.reviews.index(
    memberAuthConnection,
    {
      body: {
        customer_id: memberAuth.id,
        page: 10,
        page_size: 10,
      },
    },
  );
  typia.assert(highPageResult);
  TestValidator.equals("high page empty data", highPageResult.data, []);
  TestValidator.equals(
    "high page current is 10",
    highPageResult.pagination.current,
    10,
  );
  TestValidator.equals(
    "high page pages is 0",
    highPageResult.pagination.pages,
    0,
  );
  // Test 4.2: Page size at minimum boundary (1)
  const minPageSizeResult = await api.functional.ecommerceMall.reviews.index(
    memberAuthConnection,
    {
      body: {
        customer_id: memberAuth.id,
        page: 1,
        page_size: 1,
      },
    },
  );
  typia.assert(minPageSizeResult);
  TestValidator.equals("min page size empty data", minPageSizeResult.data, []);
  TestValidator.equals(
    "min page size pagination limit is 1",
    minPageSizeResult.pagination.limit,
    1,
  );
  // Test 4.3: Page size at maximum boundary (100)
  const maxPageSizeResult = await api.functional.ecommerceMall.reviews.index(
    memberAuthConnection,
    {
      body: {
        customer_id: memberAuth.id,
        page: 1,
        page_size: 100,
      },
    },
  );
  typia.assert(maxPageSizeResult);
  TestValidator.equals("max page size empty data", maxPageSizeResult.data, []);
  TestValidator.equals(
    "max page size pagination limit is 100",
    maxPageSizeResult.pagination.limit,
    100,
  );
  // Step 5: Verify member can see their own reviews when filters removed
  const allMemberReviews = await api.functional.ecommerceMall.reviews.index(
    memberAuthConnection,
    {
      body: {
        customer_id: memberAuth.id,
        page: 1,
        page_size: 100,
      },
    },
  );
  typia.assert(allMemberReviews);
  // If member has reviews, verify they can see them without filters
  if (allMemberReviews.data.length > 0) {
    TestValidator.equals(
      "member can view own reviews without filters",
      allMemberReviews.data.length,
      memberOwnReviews.data.length,
    );
  }
  TestValidator.equals(
    "empty pagination records is 0",
    emptyProductFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty pagination pages is 0",
    emptyProductFilterResult.pagination.pages,
    0,
  );
}
