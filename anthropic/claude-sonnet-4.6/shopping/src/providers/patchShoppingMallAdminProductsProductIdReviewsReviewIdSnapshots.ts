import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallReviewSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallReviewSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminProductsProductIdReviewsReviewIdSnapshots(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewSnapshot.IRequest;
}): Promise<IPageIShoppingMallReviewSnapshot.ISummary> {
  // Validate product exists (admin can access even deleted products)
  await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  // Validate review exists and belongs to the given product (admin can access deleted reviews too)
  await MyGlobal.prisma.shopping_mall_reviews.findFirstOrThrow({
    where: {
      id: props.reviewId,
      product_id: props.productId,
    },
    select: { id: true },
  });
  // Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause for snapshots with merged date-range and rating filters
  const whereClause = {
    shopping_mall_review_id: props.reviewId,
    ...(props.body.from != null || props.body.to != null
      ? {
          created_at: {
            ...(props.body.from != null && { gte: props.body.from }),
            ...(props.body.to != null && { lte: props.body.to }),
          },
        }
      : {}),
    ...(props.body.ratingMin != null || props.body.ratingMax != null
      ? {
          rating: {
            ...(props.body.ratingMin != null && { gte: props.body.ratingMin }),
            ...(props.body.ratingMax != null && { lte: props.body.ratingMax }),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_review_snapshotsWhereInput;
  // Query snapshots in chronological order
  const data = await MyGlobal.prisma.shopping_mall_review_snapshots.findMany({
    where: whereClause,
    orderBy: { created_at: "asc" },
    skip,
    take: limit,
    ...ShoppingMallReviewSnapshotAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_review_snapshots.count({
    where: whereClause,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallReviewSnapshotAtSummaryTransformer.transform,
    ),
  };
}
