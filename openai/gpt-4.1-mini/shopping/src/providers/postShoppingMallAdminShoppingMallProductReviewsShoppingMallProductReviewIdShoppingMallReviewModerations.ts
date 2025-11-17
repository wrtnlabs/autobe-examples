import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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

export async function postShoppingMallAdminShoppingMallProductReviewsShoppingMallProductReviewIdShoppingMallReviewModerations(props: {
  admin: AdminPayload;
  shoppingMallProductReviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewModeration.ICreate;
}): Promise<IShoppingMallReviewModeration> {
  // Verify the product review exists
  const productReview =
    await MyGlobal.prisma.shopping_mall_product_reviews.findUnique({
      where: { id: props.shoppingMallProductReviewId },
    });

  if (!productReview) {
    throw new HttpException("Product review not found", 404);
  }

  // Verify the admin exists
  const adminRecord = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: { id: props.admin.id },
  });

  if (!adminRecord) {
    throw new HttpException("Admin not found", 404);
  }

  // Create moderation record
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_review_moderations.create(
    {
      data: {
        id: v4(),
        shopping_mall_product_review_id: props.shoppingMallProductReviewId,
        shopping_mall_admin_id: props.admin.id,
        action: props.body.action,
        comment: props.body.comment ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );

  // Build and return DTO
  return {
    id: created.id,
    shoppingMallProductReviewId:
      created.shopping_mall_product_review_id satisfies string as string &
        tags.Format<"uuid">,
    shoppingMallAdminId:
      created.shopping_mall_admin_id satisfies string as string &
        tags.Format<"uuid">,
    action: created.action,
    comment: created.comment ?? null,
    createdAt: toISOStringSafe(created.created_at),
    updatedAt: toISOStringSafe(created.updated_at),
    deletedAt: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
    productReview: {
      id: productReview.id satisfies string as string & tags.Format<"uuid">,
      shopping_mall_product_id:
        productReview.shopping_mall_product_id satisfies string as string &
          tags.Format<"uuid">,
      shopping_mall_customer_id:
        productReview.shopping_mall_customer_id satisfies string as string &
          tags.Format<"uuid">,
      rating: productReview.rating,
      title: productReview.title,
      body: productReview.body,
      moderation_status: productReview.moderation_status,
      created_at: toISOStringSafe(productReview.created_at),
      updated_at: toISOStringSafe(productReview.updated_at),
      deleted_at: productReview.deleted_at
        ? toISOStringSafe(productReview.deleted_at)
        : null,
    },
    admin: {
      id: adminRecord.id satisfies string as string & tags.Format<"uuid">,
      email: adminRecord.email,
      created_at: toISOStringSafe(adminRecord.created_at),
      updated_at: toISOStringSafe(adminRecord.updated_at),
    },
  } satisfies IShoppingMallReviewModeration;
}
