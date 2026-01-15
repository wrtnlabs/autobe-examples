import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallReviewReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReply";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallReviewReplyAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_review_repliesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        body: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        review: {
          select: {
            id: true,
          },
        },
        seller: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_review_repliesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallReviewReply.ISummary> {
    return {
      id: input.id,
      review_id: input.review.id,
      content: input.body,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      seller_id: input.seller.id,
    };
  }
}
