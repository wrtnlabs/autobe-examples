import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewModeration";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminProductReviewsProductReviewIdReviewModerationsId(props: {
  admin: AdminPayload;
  productReviewId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewModeration> {
  const { productReviewId, id } = props;

  const moderation =
    await MyGlobal.prisma.shopping_mall_review_moderations.findFirst({
      where: {
        id,
        shopping_mall_product_review_id: productReviewId,
        deleted_at: null,
      },
    });

  if (!moderation) {
    throw new HttpException("Moderation record not found", 404);
  }

  return {
    id: moderation.id,
    shopping_mall_product_review_id: moderation.shopping_mall_product_review_id,
    shopping_mall_admin_id: moderation.shopping_mall_admin_id,
    action: moderation.action,
    comment: moderation.comment ?? null,
    created_at: toISOStringSafe(moderation.created_at),
    updated_at: toISOStringSafe(moderation.updated_at),
    deleted_at: moderation.deleted_at
      ? toISOStringSafe(moderation.deleted_at)
      : null,
  };
}
