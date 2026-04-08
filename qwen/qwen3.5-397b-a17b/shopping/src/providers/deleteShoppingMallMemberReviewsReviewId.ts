import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallMemberReviewsReviewId(props: {
  member: MemberPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<void> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
    select: {
      id: true,
      shopping_mall_member_id: true,
      deleted_at: true,
      rating: true,
      content: true,
    },
  });
  if (review.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  if (review.shopping_mall_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_review_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_review_id: review.id,
      rating: review.rating,
      content: review.content,
      created_at: now,
    },
  });
  await MyGlobal.prisma.shopping_mall_reviews.update({
    where: { id: props.reviewId },
    data: {
      deleted_at: now,
    },
  });
}
