import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductReviewVoteStats } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewVoteStats";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductReviewVoteStatsTransformer {
  export type Payload = Prisma.shopping_mall_review_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
        review: true,
        customer: true,
        seller: true,
        admin: true,
      },
    } satisfies Prisma.shopping_mall_review_votesFindManyArgs;
  }
  export async function transform(
    input: Payload[],
  ): Promise<IShoppingMallProductReviewVoteStats> {
    const helpfulCount = input.filter(
      (vote) => vote.vote_type === "helpful",
    ).length;
    const unhelpfulCount = input.filter(
      (vote) => vote.vote_type === "unhelpful",
    ).length;
    return {
      helpful_votes: helpfulCount,
      unhelpful_votes: unhelpfulCount,
    };
  }
}
