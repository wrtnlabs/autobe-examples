import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIShoppingMallReviewReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewReaction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallReviewReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReaction";

export async function patchShoppingMallReviewsReviewIdReactions(props: {
  reviewId: string;
}): Promise<IPageIShoppingMallReviewReaction> {
  // Verify review exists (required for foreign key constraint)
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
  });

  if (!review) {
    throw new HttpException("Review not found", 404);
  }

  // Extract pagination from query parameters (default values from IPage.IPagination constraints)
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const [reactions, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_review_reactions.findMany({
      where: { shopping_mall_review_id: props.reviewId },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_review_reactions.count({
      where: { shopping_mall_review_id: props.reviewId },
    }),
  ]);

  // Convert to DTO type - IShoppingMallReviewReaction only has 'type' field
  const data: IShoppingMallReviewReaction[] = reactions.map((reaction) => ({
    type: reaction.reaction_type as "upvote" | "downvote",
  }));

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
