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
export async function test_api_product_reviews_search_by_text_and_helpfulness(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(member);
  // Step 2: Use a unique product code for searching
  const productCode = "test-product-" + RandomGenerator.alphaNumeric(8);
  // Step 3: Search for reviews with 'battery' and helpful votes >= 5
  const searchQuery = {
    search_text: "battery",
    helpful_votes_min: 5,
    sort_by: "helpful_votes",
    order: "desc",
    limit: 10,
  } satisfies ICommunityPlatformProductReview.IRequest;
  const searchResult =
    await api.functional.communityPlatform.member.products.reviews.index(
      memberConnection,
      {
        productCode,
        body: searchQuery,
      },
    );
  typia.assert(searchResult);
  // Step 4: Validate results
  // Verify all returned reviews contain 'battery' in title or content
  for (const review of searchResult.data) {
    TestValidator.predicate(
      "review contains 'battery' in title or content",
      review.title.toLowerCase().includes("battery") ||
        review.excerpt.toLowerCase().includes("battery"),
    );
    TestValidator.predicate(
      "review has at least 5 helpful votes",
      review.helpful_count >= 5,
    );
  }
  // Verify results are sorted by helpful_votes descending
  for (let i = 0; i < searchResult.data.length - 1; i++) {
    TestValidator.predicate(
      "reviews sorted by helpful votes descending",
      searchResult.data[i].helpful_count >=
        searchResult.data[i + 1].helpful_count,
    );
  }
  // Verify we got some results (not empty)
  TestValidator.predicate(
    "at least one review found matching criteria",
    searchResult.data.length > 0,
  );
}
