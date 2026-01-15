import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProductReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductReviewVote";
import { prepare_random_community_platform_product_review_vote } from "../../../prepare/prepare_random_community_platform_product_review_vote";
import { generate_random_community_platform_member_products_reviews_votes_create } from "../../../generate/generate_random_community_platform_member_products_reviews_votes_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_product_review_vote_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Create connection for member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate member using authorization utility function
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
  // Step 2: Generate a random product code and review ID
  const productCode = RandomGenerator.alphaNumeric(10);
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Create a vote on the product review using the generation utility function
  const vote: ICommunityPlatformProductReviewVote =
    await generate_random_community_platform_member_products_reviews_votes_create(
      memberConnection,
      {
        params: {
          productCode,
          reviewId,
        },
        body: {
          value: 1,
          vote_type: "up",
        } satisfies ICommunityPlatformProductReviewVote.ICreate,
      },
    );
  typia.assert(vote);
  // Step 4: Retrieve the vote using the API endpoint with the member's ID
  const retrievedVote: ICommunityPlatformProductReviewVote =
    await api.functional.communityPlatform.member.products.reviews.votes.at(
      memberConnection,
      {
        productCode,
        reviewId,
        userId: member.id,
      },
    );
  typia.assert(retrievedVote);
  // Step 5: Validate that the retrieved vote matches the created vote
  TestValidator.equals(
    "vote type matches expected",
    retrievedVote.vote_type,
    vote.vote_type,
  );
}
