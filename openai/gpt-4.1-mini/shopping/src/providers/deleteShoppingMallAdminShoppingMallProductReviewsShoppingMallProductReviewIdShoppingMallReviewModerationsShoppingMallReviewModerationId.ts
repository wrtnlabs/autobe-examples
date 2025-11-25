import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminShoppingMallProductReviewsShoppingMallProductReviewIdShoppingMallReviewModerationsShoppingMallReviewModerationId(props: {
  admin: AdminPayload;
  shoppingMallProductReviewId: string & tags.Format<"uuid">;
  shoppingMallReviewModerationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const moderation =
    await MyGlobal.prisma.shopping_mall_review_moderations.findFirst({
      where: {
        id: props.shoppingMallReviewModerationId,
        shopping_mall_product_review_id: props.shoppingMallProductReviewId,
        deleted_at: null,
      },
    });

  if (!moderation) {
    throw new HttpException("Review moderation record not found.", 404);
  }

  await MyGlobal.prisma.shopping_mall_review_moderations.delete({
    where: {
      id: props.shoppingMallReviewModerationId,
    },
  });
}
