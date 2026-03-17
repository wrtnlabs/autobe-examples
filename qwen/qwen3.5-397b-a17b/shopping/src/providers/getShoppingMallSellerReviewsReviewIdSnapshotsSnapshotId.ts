import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallReviewSnapshotTransformer } from "../transformers/ShoppingMallReviewSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerReviewsReviewIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  reviewId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_review_snapshots.findFirst({
      where: {
        id: props.snapshotId,
        shopping_mall_review_id: props.reviewId,
      },
      ...ShoppingMallReviewSnapshotTransformer.select(),
    });
  if (!snapshot) {
    throw new HttpException("Not Found", 404);
  }
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
    select: { shopping_order_item_id: true },
  });
  if (!review) {
    throw new HttpException("Not Found", 404);
  }
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: review.shopping_order_item_id },
    select: { shopping_mall_product_variant_id: true },
  });
  if (!orderItem) {
    throw new HttpException("Not Found", 404);
  }
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: orderItem.shopping_mall_product_variant_id },
      select: { shopping_mall_product_id: true },
    });
  if (!variant) {
    throw new HttpException("Not Found", 404);
  }
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: variant.shopping_mall_product_id },
    select: { shopping_seller_id: true },
  });
  if (!product || product.shopping_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallReviewSnapshotTransformer.transform(snapshot);
}
