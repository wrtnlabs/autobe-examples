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
export async function test_api_product_reviews_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 2: Generate mock product code
  const productCode = RandomGenerator.alphaNumeric(8);
  // Step 3: Test pagination endpoint with valid parameters
  // We can't create reviews (no create endpoint available), so we test the response structure
  const response =
    await api.functional.communityPlatform.member.products.reviews.index(
      memberConnection,
      {
        productCode: productCode,
        body: {
          page: 1,
          limit: 10,
          sort_by: "rating",
          order: "desc",
        } satisfies ICommunityPlatformProductReview.IRequest,
      },
    );
  // Validate response structure
  typia.assert(response);
  // Verify pagination structure
  TestValidator.equals(
    "pagination has correct structure",
    typeof response.pagination,
    "object",
  );
  TestValidator.equals(
    "pagination current is number",
    typeof response.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination limit is number",
    typeof response.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination records is number",
    typeof response.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination pages is number",
    typeof response.pagination.pages,
    "number",
  );
  // Verify data structure
  TestValidator.equals("data is array", Array.isArray(response.data), true);
  // Verify each review summary has correct structure
  for (const review of response.data) {
    TestValidator.equals("review id is string", typeof review.id, "string");
    TestValidator.predicate(
      "review rating is number",
      typeof review.rating === "number",
    );
    TestValidator.predicate(
      "review rating is between 1-5",
      review.rating >= 1 && review.rating <= 5,
    );
    TestValidator.equals(
      "review title is string",
      typeof review.title,
      "string",
    );
    TestValidator.equals(
      "review excerpt is string",
      typeof review.excerpt,
      "string",
    );
    TestValidator.predicate(
      "review helpful_count is number",
      typeof review.helpful_count === "number",
    );
    TestValidator.predicate(
      "review helpful_count is non-negative",
      review.helpful_count >= 0,
    );
    TestValidator.equals(
      "review created_at is string",
      typeof review.created_at,
      "string",
    );
    TestValidator.equals(
      "review reviewer is object",
      typeof review.reviewer,
      "object",
    );
    TestValidator.equals(
      "review product is object",
      typeof review.product,
      "object",
    );
    TestValidator.equals(
      "review verified_buyer is boolean",
      typeof review.verified_buyer,
      "boolean",
    );
  }
  // Verify pagination values match request
  TestValidator.equals(
    "pagination limit matches request",
    response.pagination.limit,
    10,
  );
  // Verify sort_by parameter validation
  // Note: We can't verify sorting logic without actual reviews, but we can verify the endpoint accepts the parameter
  const response2 =
    await api.functional.communityPlatform.member.products.reviews.index(
      memberConnection,
      {
        productCode: productCode,
        body: {
          page: 1,
          limit: 25,
          sort_by: "helpful_votes",
          order: "asc",
        } satisfies ICommunityPlatformProductReview.IRequest,
      },
    );
  typia.assert(response2);
  TestValidator.equals(
    "second response limit matches request",
    response2.pagination.limit,
    25,
  );
  // Test with creation date sorting
  const response3 =
    await api.functional.communityPlatform.member.products.reviews.index(
      memberConnection,
      {
        productCode: productCode,
        body: {
          page: 1,
          limit: 5,
          sort_by: "created_at",
          order: "asc",
        } satisfies ICommunityPlatformProductReview.IRequest,
      },
    );
  typia.assert(response3);
  TestValidator.equals(
    "third response limit matches request",
    response3.pagination.limit,
    5,
  );
}
