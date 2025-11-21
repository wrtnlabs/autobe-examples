import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function getShoppingMallReviewsReviewId(props: {
  reviewId: string;
}): Promise<IShoppingMallReview> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
  });

  if (!review) {
    throw new HttpException("Review not found", 404);
  }

  // Map Prisma status values to DTO status enum values
  const mappedStatus: IShoppingMallReview["status"] = (() => {
    switch (review.status) {
      case "published":
        return "approved";
      case "hidden":
        return "flagged";
      default:
        return review.status as IShoppingMallReview["status"];
    }
  })();

  return {
    id: review.id,
    title:
      review.title !== null && review.title !== undefined
        ? (review.title satisfies string as string)
        : "",
    body:
      review.body !== null && review.body !== undefined
        ? (review.body satisfies string as string)
        : "",
    rating: review.rating,
    status: mappedStatus,
  };
}
