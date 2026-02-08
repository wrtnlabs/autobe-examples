import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallProductReviewsProductReviewId(props: {
  productReviewId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductReview> {
  const record = await MyGlobal.prisma.shopping_mall_product_reviews.findUnique(
    {
      where: { id: props.productReviewId },
      select: {
        id: true,
        shopping_mall_customer_id: true,
        shopping_mall_order_item_id: true,
        shopping_mall_product_variant_id: true,
        rating: true,
        body: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  if (!record) throw new HttpException("Product review not found", 404);
  return {
    id: record.id,
    shopping_mall_customer_id: record.shopping_mall_customer_id,
    shopping_mall_order_item_id: record.shopping_mall_order_item_id,
    shopping_mall_product_variant_id: record.shopping_mall_product_variant_id,
    rating: record.rating,
    body: record.body === null ? null : record.body,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
