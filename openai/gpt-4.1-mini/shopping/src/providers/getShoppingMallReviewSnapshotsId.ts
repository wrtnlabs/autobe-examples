import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallReviewSnapshotsId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewSnapshot> {
  const record =
    await MyGlobal.prisma.shopping_mall_review_snapshots.findUnique({
      where: { id: props.id },
      select: {
        id: true,
        shopping_mall_product_review_id: true,
        rating: true,
        body: true,
        snapshot_created_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!record) {
    throw new HttpException("Review snapshot not found", 404);
  }
  return {
    id: record.id,
    shopping_mall_product_review_id: record.shopping_mall_product_review_id,
    rating: record.rating,
    body: record.body,
    snapshot_created_at: toISOStringSafe(record.snapshot_created_at),
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
