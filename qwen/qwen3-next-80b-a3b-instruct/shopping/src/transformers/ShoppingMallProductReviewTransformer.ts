import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import { IShoppingMallReviewReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReply";
import { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";
import { IShoppingMallReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewFlag";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ShoppingMallReviewFlagAtSummaryTransformer } from "./ShoppingMallReviewFlagAtSummaryTransformer";
import { ShoppingMallReviewImageAtSummaryTransformer } from "./ShoppingMallReviewImageAtSummaryTransformer";
import { ShoppingMallReviewReplyAtSummaryTransformer } from "./ShoppingMallReviewReplyAtSummaryTransformer";

export namespace ShoppingMallProductReviewTransformer {
  export type Payload = Prisma.shopping_mall_reviewsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        rating: true,
        title: true,
        body: true,
        verified_purchase: true,
        created_at: true,
        updated_at: true,
        vote_count: true,
        deleted_at: true,
        product: {
          select: {
            id: true,
          },
        },
        customer: {
          select: {
            id: true,
          },
        },
        shopping_mall_review_votes: {
          select: {
            id: true,
          },
        },
        shopping_mall_review_flags:
          ShoppingMallReviewFlagAtSummaryTransformer.select(),
        shopping_mall_review_moderation_logs: {
          select: {
            id: true,
          },
        },
        shopping_mall_review_images:
          ShoppingMallReviewImageAtSummaryTransformer.select(),
        shopping_mall_review_replies:
          ShoppingMallReviewReplyAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_reviewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductReview> {
    // Sort replies and flags by created_at to get latest
    const latestReply =
      input.shopping_mall_review_replies.length > 0
        ? input.shopping_mall_review_replies.sort(
            (a, b) => b.created_at.getTime() - a.created_at.getTime(),
          )[0]
        : null;
    const latestFlag =
      input.shopping_mall_review_flags.length > 0
        ? input.shopping_mall_review_flags.sort(
            (a, b) => b.created_at.getTime() - a.created_at.getTime(),
          )[0]
        : null;
    return {
      id: input.id,
      product_id: input.product.id,
      rating: input.rating,
      title: input.title ?? "",
      content: input.body,
      status: input.status as "pending" | "approved" | "rejected",
      is_verified: input.verified_purchase,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: toISOStringSafe(input.deleted_at),
      votecount: input.vote_count,
      commentcount: input.shopping_mall_review_replies.length,
      reply: latestReply
        ? await ShoppingMallReviewReplyAtSummaryTransformer.transform(
            latestReply,
          )
        : null,
      images: await ArrayUtil.asyncMap(
        input.shopping_mall_review_images,
        async (image) =>
          await ShoppingMallReviewImageAtSummaryTransformer.transform(image),
      ),
      flags: latestFlag
        ? await ShoppingMallReviewFlagAtSummaryTransformer.transform(latestFlag)
        : null,
      customer_id: input.customer.id,
    };
  }
}
