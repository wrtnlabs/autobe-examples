import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewVote";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallReviewVoteTransformer {
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
        deleted_at: true,
        review: true,
        customer: true,
      },
    } satisfies Prisma.shopping_mall_review_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallReviewVote> {
    return {
      vote_type: input.vote_type satisfies string as "up" | "down",
      customer_id: input.customer.id,
    };
  }
}
