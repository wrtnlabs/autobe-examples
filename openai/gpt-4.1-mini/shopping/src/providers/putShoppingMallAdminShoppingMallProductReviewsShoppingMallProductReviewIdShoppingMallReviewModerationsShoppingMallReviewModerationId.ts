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

export async function putShoppingMallAdminShoppingMallProductReviewsShoppingMallProductReviewIdShoppingMallReviewModerationsShoppingMallReviewModerationId(props: {
  admin: AdminPayload;
  shoppingMallProductReviewId: string & tags.Format<"uuid">;
  shoppingMallReviewModerationId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewModeration.IUpdate;
}): Promise<IShoppingMallReviewModeration> {
  const existing =
    await MyGlobal.prisma.shopping_mall_review_moderations.findUnique({
      where: { id: props.shoppingMallReviewModerationId },
    });

  if (
    !existing ||
    existing.shopping_mall_product_review_id !==
      props.shoppingMallProductReviewId
  ) {
    throw new HttpException("Review moderation not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_review_moderations.update(
    {
      where: { id: props.shoppingMallReviewModerationId },
      data: {
        action: props.body.action,
        comment: props.body.comment ?? null,
        updated_at: new Date(),
      },
      include: {
        productReview: true,
        admin: true,
      },
    },
  );

  return {
    id: updated.id as string & tags.Format<"uuid">,
    shoppingMallProductReviewId:
      updated.shopping_mall_product_review_id as string & tags.Format<"uuid">,
    shoppingMallAdminId: updated.shopping_mall_admin_id as string &
      tags.Format<"uuid">,
    action: updated.action,
    comment: updated.comment ?? null,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
    deletedAt: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
    productReview: {
      id: updated.productReview.id as string & tags.Format<"uuid">,
      shopping_mall_product_id: updated.productReview
        .shopping_mall_product_id as string & tags.Format<"uuid">,
      shopping_mall_customer_id: updated.productReview
        .shopping_mall_customer_id as string & tags.Format<"uuid">,
      rating: updated.productReview.rating,
      title: updated.productReview.title,
      body: updated.productReview.body,
      moderation_status: updated.productReview.moderation_status,
      created_at: toISOStringSafe(updated.productReview.created_at),
      updated_at: toISOStringSafe(updated.productReview.updated_at),
      deleted_at: updated.productReview.deleted_at
        ? toISOStringSafe(updated.productReview.deleted_at)
        : null,
    },
    admin: {
      id: updated.admin.id as string & tags.Format<"uuid">,
      email: updated.admin.email,
      created_at: toISOStringSafe(updated.admin.created_at),
      updated_at: toISOStringSafe(updated.admin.updated_at),
    },
  };
}
