import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallProductReviewSnapshotsProductReviewSnapshotId(props: {
  productReviewSnapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductReviewSnapshot> {
  const record =
    await MyGlobal.prisma.shopping_mall_product_review_snapshots.findUnique({
      where: { id: props.productReviewSnapshotId },
    });
  if (!record) {
    throw new HttpException("Product review snapshot not found", 404);
  }
  return {
    id: record.id,
    product_review_id: record.product_review_id,
    order_item_id: record.order_item_id,
    product_variant_id: record.product_variant_id,
    rating: record.rating,
    body: record.body === null ? null : record.body,
    created_at: record.created_at,
    updated_at: record.updated_at,
    deleted_at: record.deleted_at === null ? null : record.deleted_at,
  };
}
