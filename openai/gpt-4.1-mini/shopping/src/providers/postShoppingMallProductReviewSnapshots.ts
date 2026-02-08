import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductReviewSnapshotCollector } from "../collectors/ShoppingMallProductReviewSnapshotCollector";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallProductReviewSnapshots(props: {
  body: IShoppingMallProductReviewSnapshot.ICreate & {
    rating: number;
    product_review_id: string;
    order_item_id: string;
    product_variant_id: string;
  };
}): Promise<IShoppingMallProductReviewSnapshot> {
  if (props.body.rating < 1 || props.body.rating > 5) {
    throw new HttpException("Rating must be between 1 and 5", 400);
  }
  const productReview =
    await MyGlobal.prisma.shopping_mall_product_reviews.findUnique({
      where: { id: props.body.product_review_id },
    });
  if (!productReview) throw new HttpException("Product review not found", 404);
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: props.body.order_item_id },
  });
  if (!orderItem) throw new HttpException("Order item not found", 404);
  const productVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: props.body.product_variant_id },
    });
  if (!productVariant)
    throw new HttpException("Product variant not found", 404);
  const createInput = await ShoppingMallProductReviewSnapshotCollector.collect({
    body: props.body,
    productReview,
    orderItem,
    productVariant,
  });
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    return await tx.shopping_mall_product_review_snapshots.create({
      data: createInput,
    });
  });
  return {
    id: created.id,
    product_review_id: created.product_review_id,
    order_item_id: created.order_item_id,
    product_variant_id: created.product_variant_id,
    rating: created.rating,
    body: created.body === null ? undefined : created.body,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
