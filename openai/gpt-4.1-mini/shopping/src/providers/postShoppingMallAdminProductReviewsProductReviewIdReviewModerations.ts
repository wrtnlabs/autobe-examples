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

export async function postShoppingMallAdminProductReviewsProductReviewIdReviewModerations(props: {
  admin: AdminPayload;
  productReviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewModeration.ICreate;
}): Promise<IShoppingMallReviewModeration> {
  const now = toISOStringSafe(new Date());
  const newId: string & tags.Format<"uuid"> = v4();

  const created = await MyGlobal.prisma.shopping_mall_review_moderations.create(
    {
      data: {
        id: newId,
        shopping_mall_product_review_id: props.productReviewId,
        shopping_mall_admin_id: props.body.shopping_mall_admin_id,
        action: props.body.action,
        comment: props.body.comment ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: props.body.deleted_at ?? null,
      },
    },
  );

  return {
    id: created.id,
    shopping_mall_product_review_id: created.shopping_mall_product_review_id,
    shopping_mall_admin_id: created.shopping_mall_admin_id,
    action: created.action,
    comment: created.comment,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
