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

export async function putShoppingMallAdminProductReviewsProductReviewIdReviewModerationsId(props: {
  admin: AdminPayload;
  productReviewId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallReviewModeration.IUpdate;
}): Promise<IShoppingMallReviewModeration> {
  const { productReviewId, id, body } = props;

  const moderation =
    await MyGlobal.prisma.shopping_mall_review_moderations.findUniqueOrThrow({
      where: { id },
    });

  if (moderation.shopping_mall_product_review_id !== productReviewId) {
    throw new HttpException(
      "Unauthorized to update this review moderation",
      403,
    );
  }

  const updated = await MyGlobal.prisma.shopping_mall_review_moderations.update(
    {
      where: { id },
      data: {
        ...(body.shopping_mall_admin_id !== undefined &&
          body.shopping_mall_admin_id !== null && {
            shopping_mall_admin_id: body.shopping_mall_admin_id,
          }),
        ...(body.action !== undefined && { action: body.action }),
        ...(body.comment !== undefined && { comment: body.comment }),
        ...(body.created_at !== undefined && {
          created_at: body.created_at ?? undefined,
        }),
        ...(body.updated_at !== undefined && {
          updated_at: body.updated_at ?? undefined,
        }),
        ...(body.deleted_at !== undefined && {
          deleted_at: body.deleted_at ?? undefined,
        }),
      },
    },
  );

  return {
    id: updated.id,
    shopping_mall_product_review_id:
      updated.shopping_mall_product_review_id as string & tags.Format<"uuid">,
    shopping_mall_admin_id: updated.shopping_mall_admin_id ?? undefined,
    action: updated.action,
    comment: updated.comment ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
