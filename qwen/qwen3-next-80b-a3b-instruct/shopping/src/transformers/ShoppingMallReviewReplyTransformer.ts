import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallReviewReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReply";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallReviewReplyTransformer {
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
        review: true,
        seller: true,
      },
    } satisfies Prisma.shopping_mall_review_repliesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallReviewReply> {
    return {
      id: input.id,
      reply_content: input.body,
      created_at: input.created_at.toISOString(),
      author_id: input.seller.id,
    };
  }
}
