import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminProductReviewsProductReviewIdReviewModerationsId(props: {
  admin: AdminPayload;
  productReviewId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, productReviewId, id } = props;

  const existing =
    await MyGlobal.prisma.shopping_mall_review_moderations.findFirst({
      where: {
        id,
        shopping_mall_product_review_id: productReviewId,
      },
      select: { id: true },
    });

  if (!existing) {
    throw new HttpException("Review moderation not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_review_moderations.delete({
    where: { id },
  });
}
