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
export async function test_api_product_review_search_by_rating_and_date(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create guest connection and authenticate
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth: ICommunityPlatformGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformGuest.IJoin,
    });
  typia.assert(guestAuth);
  // Step 2: Generate product code for review search
  const productCode = typia.random<string>();
  // Step 3: Calculate date range (last 30 days)
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // Step 4: Create search criteria with rating_min=4 and created_after=30 days ago
  const searchCriteria: ICommunityPlatformProductReview.IRequest = {
    rating_min: 4, // Minimum rating of 4 stars
    created_after: thirtyDaysAgo, // Reviews from last 30 days
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformProductReview.IRequest;
  // Step 5: Execute product review search API with guest connection
  const searchResult: IPageICommunityPlatformProductReview.ISummary =
    await api.functional.communityPlatform.guest.products.reviews.index(
      guestConnection, // Use guest-specific connection
      {
        productCode, // Path parameter
        body: searchCriteria, // Request body with filters
      },
    );
  typia.assert(searchResult);
  // Step 6: Validate pagination properties
  TestValidator.equals("page should be 1", searchResult.pagination.current, 1);
  TestValidator.equals("limit should be 10", searchResult.pagination.limit, 10);
  TestValidator.predicate(
    "records should be >= 0",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be >= 0",
    searchResult.pagination.pages >= 0,
  );
  // Step 7: Validate that all returned reviews meet rating and date criteria
  for (const review of searchResult.data) {
    // All reviews must have rating >= 4
    TestValidator.predicate("review rating >= 4", review.rating >= 4);
    // All reviews must have been created after 30 days ago
    const reviewDate = new Date(review.created_at);
    TestValidator.predicate(
      "review created after 30 days ago",
      reviewDate >= new Date(thirtyDaysAgo),
    );
  }
  // Step 8: Validate structure of reviews
  for (const review of searchResult.data) {
    typia.assert<ICommunityPlatformProductReview.ISummary>(review);
    typia.assert<ICommunityPlatformMember.ISummary>(review.reviewer);
    typia.assert<ICommunityPlatformProduct.ISummary>(review.product);
  }
}
