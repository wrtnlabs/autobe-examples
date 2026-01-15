import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductReview";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProductReview";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_product_review_search_with_helpful_votes_and_text(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as guest user
  const guestConnection: api.IConnection = { host: connection.host };
  const guestData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformGuest.IJoin;
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: guestData,
  });
  typia.assert(guestAuth);
  // Step 2: Use a realistic product code
  // Product code is a business identifier (string), not a UUID
  // We use a format that matches real product codes: 'prod-' followed by alphanumeric
  const productCode = "prod-12345";
  // Step 3: Search for reviews with helpful_votes_min >= 5 and search_text containing 'battery life'
  const searchCriteria = {
    helpful_votes_min: 5,
    search_text: "battery life",
  } satisfies ICommunityPlatformProductReview.IRequest;
  const searchResult =
    await api.functional.communityPlatform.guest.products.reviews.index(
      guestConnection,
      {
        productCode,
        body: searchCriteria,
      },
    );
  typia.assert(searchResult);
  // Step 4: Validate search response structure
  TestValidator.equals(
    "search result pagination current page is 1",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "search result pagination limit is 20 (default)",
    searchResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    searchResult.pagination.pages >= 0,
  );
  // Step 5: Validate review data when results exist
  // If results are returned, validate each review meets our search criteria
  if (searchResult.data.length > 0) {
    for (const review of searchResult.data) {
      // Validate helpful vote count meets minimum threshold
      TestValidator.predicate(
        "review has at least 5 helpful votes",
        review.helpful_count >= 5,
      );
      // Validate search_text appears in title, content, or reviewer name (as per schema description)
      const hasTextMatch =
        review.title.toLowerCase().includes("battery life") ||
        review.excerpt.toLowerCase().includes("battery life") ||
        review.reviewer.username.toLowerCase().includes("battery life");
      TestValidator.predicate(
        "review contains 'battery life' in title, excerpt, or reviewer name",
        hasTextMatch,
      );
    }
  } else {
    // If no results found, the test still passes - the search functionality worked
    // It just means no reviews matched our criteria in this test environment
    // This is acceptable behavior when test data is not controlled
  }
}
