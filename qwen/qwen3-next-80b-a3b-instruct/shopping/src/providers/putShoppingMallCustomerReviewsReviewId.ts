import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReview.IUpdate;
}): Promise<IShoppingMallReview> {
  const existingReview = await MyGlobal.prisma.shopping_mall_reviews.findUnique(
    {
      where: {
        id: props.reviewId,
      },
    },
  );

  if (!existingReview) {
    throw new HttpException("Review not found", 404);
  }

  if (existingReview.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: You can only update your own reviews",
      403,
    );
  }

  if (
    existingReview.status === "rejected" ||
    existingReview.status === "hidden"
  ) {
    throw new HttpException("Cannot update rejected or hidden reviews", 403);
  }

  // IShoppingMallReview.IUpdate is defined as string - this is a complete body replacement
  const updateData = {
    body: props.body,
    status: "pending", // Reset status on update
    updated_at: toISOStringSafe(new Date()),
  };

  const updatedReview = await MyGlobal.prisma.shopping_mall_reviews.update({
    where: {
      id: props.reviewId,
    },
    data: updateData,
  });

  // Return the full review with proper typing
  // title: field is required and non-nullable in DB - use directly
  // status: string from DB must be cast to literal union
  const review: IShoppingMallReview = {
    id: updatedReview.id,
    title: (updatedReview.title ?? "") satisfies string as string,
    body: updatedReview.body,
    rating: updatedReview.rating,
    status: updatedReview.status as any satisfies
      | "rejected"
      | "pending"
      | "approved"
      | "flagged" as "rejected" | "pending" | "approved" | "flagged",
  };

  return review;
}
