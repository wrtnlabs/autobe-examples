import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallReviewSnapshotTransformer } from "../transformers/ShoppingMallReviewSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminProductsProductIdReviewsReviewIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewSnapshot> {
  // Step 1: Verify product exists (admin can access deleted products — no deleted_at check)
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  // Step 2: Verify review exists and belongs to the given product
  // Admin can access deleted reviews — no deleted_at filter
  await MyGlobal.prisma.shopping_mall_reviews.findFirstOrThrow({
    where: {
      id: props.reviewId,
      product_id: props.productId,
    },
    select: { id: true },
  });
  // Step 3: Fetch snapshot, must belong to the given review
  const snapshot =
    await MyGlobal.prisma.shopping_mall_review_snapshots.findFirstOrThrow({
      where: {
        id: props.snapshotId,
        shopping_mall_review_id: props.reviewId,
      },
      ...ShoppingMallReviewSnapshotTransformer.select(),
    });
  // Step 4: Transform and return
  return ShoppingMallReviewSnapshotTransformer.transform(snapshot);
}
