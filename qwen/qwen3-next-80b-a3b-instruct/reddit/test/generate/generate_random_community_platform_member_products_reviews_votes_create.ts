import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformProductReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductReviewVote";
import { prepare_random_community_platform_product_review_vote } from "../prepare/prepare_random_community_platform_product_review_vote";
export async function generate_random_community_platform_member_products_reviews_votes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformProductReviewVote.ICreate> | undefined;
    params: {
      productCode: string;
      reviewId: string;
    };
  },
): Promise<ICommunityPlatformProductReviewVote> {
  const prepared: ICommunityPlatformProductReviewVote.ICreate =
    prepare_random_community_platform_product_review_vote(props.body);
  return await api.functional.communityPlatform.member.products.reviews.votes.create(
    connection,
    {
      body: prepared,
      productCode: props.params.productCode,
      reviewId: props.params.reviewId,
    },
  );
}
