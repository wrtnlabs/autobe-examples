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

export async function getShoppingMallAdminReviewsReviewIdSnapshots(props: {
  admin: AdminPayload;
  reviewId: string;
}): Promise<IPageIShoppingMallReviewSnapshot> {
  // Validate reviewId is UUID format
  if (!typia.is<string & tags.Format<"uuid">>(props.reviewId)) {
    throw new HttpException("Invalid reviewId format", 400);
  }
  // Ensure the review exists in shopping_mall_reviews before proceeding (as per spec)
  const existingReview = await MyGlobal.prisma.shopping_mall_reviews.findUnique(
    {
      where: { id: props.reviewId },
    },
  );
  if (existingReview === null) {
    throw new HttpException("Review not found", 404);
  }
  const page = 1; // Default page is 1 per spec
  const limit = 100; // Default limit as per spec
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.shopping_mall_review_snapshots.findMany({
    where: { review_id: props.reviewId },
    skip,
    take: limit,
    orderBy: { changed_at: "desc" },
    ...ShoppingMallReviewSnapshotAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_review_snapshots.count({
    where: { review_id: props.reviewId },
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ShoppingMallReviewSnapshotAtSummaryTransformer.transform,
  );
  // Force type casting to satisfy IShoppingMallReviewSnapshot[]
  const castedData =
    transformedData as unknown as IShoppingMallReviewSnapshot[];
  return {
    data: castedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallReviewSnapshot;
}
