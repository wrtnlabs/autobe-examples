import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminProductReviewsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductReview> {
  const { admin, id } = props;

  const adminRecord = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { id: admin.id, status: "active", deleted_at: null },
  });

  if (adminRecord === null) {
    throw new HttpException("Unauthorized", 403);
  }

  const review = await MyGlobal.prisma.shopping_mall_product_reviews.findUnique(
    {
      where: { id },
    },
  );

  if (review === null) {
    throw new HttpException("Product review not found", 404);
  }

  return {
    id: review.id,
    shopping_mall_customer_id: review.shopping_mall_customer_id,
    shopping_mall_product_id: review.shopping_mall_product_id,
    shopping_mall_order_id: review.shopping_mall_order_id,
    rating: review.rating,
    review_text: review.review_text ?? null,
    status: review.status as "pending" | "approved" | "rejected",
    created_at: toISOStringSafe(review.created_at),
    updated_at: toISOStringSafe(review.updated_at),
    deleted_at: review.deleted_at ? toISOStringSafe(review.deleted_at) : null,
  };
}
