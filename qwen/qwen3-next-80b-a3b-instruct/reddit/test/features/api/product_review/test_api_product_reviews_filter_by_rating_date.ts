import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductReview";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProductReview";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_product_reviews_filter_by_rating_date(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 2: Select a product code for filtering (using a plausible random product code)
  // Since we cannot create products or reviews in the API, we assume there are pre-existing
  // products in the test environment and we use a random UUID as product code
  const productCode = typia.random<string>();
  // Step 3: Define filter criteria for reviews - only reviews with rating 4-5 in the last 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const filterRequest: ICommunityPlatformProductReview.IRequest = {
    page: 1,
    limit: 20,
    sort_by: "created_at",
    order: "desc",
    rating_min: 4,
    rating_max: 5,
    created_after: thirtyDaysAgo,
    created_before: null,
  };
  // Step 4: Perform the filter request
  const filteredResult =
    await api.functional.communityPlatform.member.products.reviews.index(
      memberConnection,
      {
        productCode,
        body: filterRequest,
      },
    );
  typia.assert(filteredResult);
  // Step 5: Validate results
  // Validate pagination
  TestValidator.equals(
    "page number correctly set",
    filteredResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit correctly set",
    filteredResult.pagination.limit,
    20,
  );
  // Validate that returned reviews meet criteria
  for (const review of filteredResult.data) {
    TestValidator.predicate(
      "review rating is 4 or 5",
      review.rating >= 4 && review.rating <= 5,
    );
    // Ensure review date is within last 30 days
    const reviewDate = new Date(review.created_at);
    TestValidator.predicate(
      "review is from last 30 days",
      reviewDate >= new Date(thirtyDaysAgo),
    );
  }
  // Validate that results are sorted by created_at descending
  // Check if reviews are ordered by created_at descending
  for (let i = 0; i < filteredResult.data.length - 1; i++) {
    const currentReview = filteredResult.data[i];
    const nextReview = filteredResult.data[i + 1];
    const currentDate = new Date(currentReview.created_at);
    const nextDate = new Date(nextReview.created_at);
    TestValidator.predicate(
      "reviews sorted by created_at descending",
      currentDate >= nextDate,
    );
  }
}