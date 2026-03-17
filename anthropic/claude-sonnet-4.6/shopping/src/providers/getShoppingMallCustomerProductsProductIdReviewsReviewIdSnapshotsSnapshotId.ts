import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallReviewSnapshotTransformer } from "../transformers/ShoppingMallReviewSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerProductsProductIdReviewsReviewIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewSnapshot> {
  // Step 1: Verify product exists and is not deleted
  await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow({
    where: {
      id: props.productId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 2: Verify review exists, belongs to the product, is not deleted,
  // and is owned by the authenticated customer
  const review = await MyGlobal.prisma.shopping_mall_reviews.findFirstOrThrow({
    where: {
      id: props.reviewId,
      product_id: props.productId,
      deleted_at: null,
    },
    select: {
      id: true,
      customer_id: true,
    },
  });
  // Step 3: Authorization — the review must belong to the requesting customer
  if (review.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Fetch the snapshot scoped to the verified review
  const snapshot =
    await MyGlobal.prisma.shopping_mall_review_snapshots.findFirstOrThrow({
      where: {
        id: props.snapshotId,
        shopping_mall_review_id: props.reviewId,
      },
      ...ShoppingMallReviewSnapshotTransformer.select(),
    });
  // Step 5: Transform and return
  return ShoppingMallReviewSnapshotTransformer.transform(snapshot);
}
