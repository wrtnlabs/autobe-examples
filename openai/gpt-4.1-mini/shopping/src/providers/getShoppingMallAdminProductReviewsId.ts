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

export async function getShoppingMallAdminProductReviewsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductReview> {
  const { id } = props;

  const record =
    await MyGlobal.prisma.shopping_mall_product_reviews.findFirstOrThrow({
      where: { id, deleted_at: null },
    });

  return {
    id: record.id,
    shopping_mall_product_sku_id: record.shopping_mall_product_sku_id,
    shopping_mall_customer_id: record.shopping_mall_customer_id,
    shopping_mall_order_id: record.shopping_mall_order_id,
    rating: record.rating,
    review_body: record.review_body ?? undefined,
    moderation_status: record.moderation_status,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  };
}
