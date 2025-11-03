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

export async function putShoppingMallAdminProductReviewsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallProductReview.IUpdate;
}): Promise<IShoppingMallProductReview> {
  const { id, body } = props;

  // Verify existence
  await MyGlobal.prisma.shopping_mall_product_reviews.findUniqueOrThrow({
    where: { id },
  });

  // Update review
  const updated = await MyGlobal.prisma.shopping_mall_product_reviews.update({
    where: { id },
    data: {
      rating: body.rating,
      review_body: body.review_body,
      moderation_status: body.moderation_status,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    shopping_mall_product_sku_id: updated.shopping_mall_product_sku_id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    rating: updated.rating,
    review_body: updated.review_body ?? undefined,
    moderation_status: updated.moderation_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
