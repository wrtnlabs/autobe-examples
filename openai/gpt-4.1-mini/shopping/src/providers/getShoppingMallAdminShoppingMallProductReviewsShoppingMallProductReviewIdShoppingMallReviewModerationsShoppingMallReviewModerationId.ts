import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewModeration";
import { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminShoppingMallProductReviewsShoppingMallProductReviewIdShoppingMallReviewModerationsShoppingMallReviewModerationId(props: {
  admin: AdminPayload;
  shoppingMallProductReviewId: string & tags.Format<"uuid">;
  shoppingMallReviewModerationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewModeration> {
  const moderation =
    await MyGlobal.prisma.shopping_mall_review_moderations.findFirst({
      where: {
        id: props.shoppingMallReviewModerationId,
        shopping_mall_product_review_id: props.shoppingMallProductReviewId,
        deleted_at: null,
      },
      include: {
        productReview: true,
        admin: true,
      },
    });

  if (!moderation) {
    throw new HttpException("Review moderation record not found", 404);
  }

  return {
    id: moderation.id,
    shoppingMallProductReviewId: moderation.shopping_mall_product_review_id,
    shoppingMallAdminId: moderation.shopping_mall_admin_id,
    action: moderation.action,
    comment: moderation.comment ?? undefined,
    createdAt: toISOStringSafe(moderation.created_at),
    updatedAt: toISOStringSafe(moderation.updated_at),
    deletedAt: moderation.deleted_at
      ? toISOStringSafe(moderation.deleted_at)
      : null,
    productReview: {
      id: moderation.productReview.id,
      shopping_mall_product_id:
        moderation.productReview.shopping_mall_product_id,
      shopping_mall_customer_id:
        moderation.productReview.shopping_mall_customer_id,
      rating: moderation.productReview.rating,
      title: moderation.productReview.title,
      body: moderation.productReview.body,
      moderation_status: moderation.productReview.moderation_status,
      created_at: toISOStringSafe(moderation.productReview.created_at),
      updated_at: toISOStringSafe(moderation.productReview.updated_at),
      deleted_at: moderation.productReview.deleted_at
        ? toISOStringSafe(moderation.productReview.deleted_at)
        : null,
    },
    admin: {
      id: moderation.admin.id,
      email: moderation.admin.email,
      created_at: toISOStringSafe(moderation.admin.created_at),
      updated_at: toISOStringSafe(moderation.admin.updated_at),
    },
  };
}
