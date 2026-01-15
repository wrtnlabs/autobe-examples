import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewVote";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallReviewVoteAtSummaryTransformer {
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
    input: Payload,
  ): Promise<IShoppingMallReviewVote.ISummary> {
    return {
      id: input.id,
      is_helpful: input.vote_type === "upvote" ? true : false,
      created_at: input.created_at.toISOString(),
    };
  }
}
