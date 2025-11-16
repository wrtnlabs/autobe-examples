import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewHelpfulnessVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewHelpfulnessVote";
import { IPageIShoppingMallReviewHelpfulnessVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewHelpfulnessVote";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallReviewsReviewIdHelpfulnessVotes(props: {
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewHelpfulnessVote.IRequest;
}): Promise<IPageIShoppingMallReviewHelpfulnessVote.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const whereCondition = {
    shopping_mall_review_id: props.reviewId,
    ...(props.body.is_helpful !== undefined &&
      props.body.is_helpful !== null && {
        is_helpful: props.body.is_helpful,
      }),
    ...(props.body.shopping_mall_buyer_id && {
      shopping_mall_buyer_id: props.body.shopping_mall_buyer_id,
    }),
    ...(() => {
      if (!props.body.from_created_at && !props.body.to_created_at) return {};
      return {
        created_at: {
          ...(props.body.from_created_at && {
            gte: new Date(props.body.from_created_at),
          }),
          ...(props.body.to_created_at && {
            lte: new Date(props.body.to_created_at),
          }),
        },
      };
    })(),
  };

  const sortBy = props.body.sort_by ?? "created_at";
  const order = props.body.order ?? "desc";
  const orderBy = { [sortBy]: order };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_review_helpfulness_votes.findMany({
      where: whereCondition,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_review_helpfulness_votes.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((vote) => ({
      id: vote.id,
      is_helpful: vote.is_helpful,
      created_at: toISOStringSafe(vote.created_at),
    })),
  };
}
